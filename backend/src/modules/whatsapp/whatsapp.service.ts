import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
type AxiosInstance = any;
import * as cron from 'node-cron';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private evolutionApi: AxiosInstance;
  private instanceName = 'streaming-platform';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Inicializar cliente de Evolution API
    const apiUrl = this.configService.get<string>('EVOLUTION_API_URL');
    const apiKey = this.configService.get<string>('EVOLUTION_API_KEY');

    this.evolutionApi = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
    });

    // Programar tareas automáticas
    this.scheduleAutomaticTasks();
  }

  // ============================================
  // MÉTODOS DE ENVÍO DE MENSAJES
  // ============================================

  // ENVIAR MENSAJE DE TEXTO SIMPLE
  async sendTextMessage(numero: string, mensaje: string, forceSend: boolean = false) {
    try {
      const isJid = numero.includes('@');
      const targetNumber = isJid ? numero.trim() : numero.replace(/\D/g, '');

      // Validar horario de envío si no es forzado (ej: entregas inmediatas de compras)
      if (!forceSend && !(await this.isWithinSendingHours())) {
        this.logger.warn(`Mensaje a ${targetNumber} encolado (fuera de horario)`);
        await this.enqueueMessage(targetNumber, mensaje, 'texto');
        return { success: false, message: 'Mensaje encolado (fuera de horario)' };
      }

      const response = await this.evolutionApi.post(
        `/message/sendText/${this.instanceName}`,
        {
          number: targetNumber,
          text: mensaje,
        },
      );

      // Registrar en logs
      await this.logNotification(targetNumber, mensaje, 'whatsapp', 'enviado');

      return { success: true, data: response.data };
    } catch (error) {
      this.logger.error(`Error enviando mensaje a ${numero}:`, error.message);
      await this.logNotification(numero, mensaje, 'whatsapp', 'fallido');
      throw new BadRequestException('Error al enviar mensaje por WhatsApp');
    }
  }

  // ENVIAR MENSAJE CON IMAGEN
  async sendImageMessage(numero: string, imagenUrl: string, caption: string) {
    try {
      const isJid = numero.includes('@');
      const targetNumber = isJid ? numero.trim() : numero.replace(/\D/g, '');

      if (!(await this.isWithinSendingHours())) {
        await this.enqueueMessage(targetNumber, caption, 'imagen', imagenUrl);
        return { success: false, message: 'Mensaje encolado (fuera de horario)' };
      }

      const response = await this.evolutionApi.post(
        `/message/sendMedia/${this.instanceName}`,
        {
          number: targetNumber,
          mediatype: 'image',
          mediaUrl: imagenUrl,
          caption: caption,
        },
      );

      await this.logNotification(targetNumber, caption, 'whatsapp', 'enviado');
      return { success: true, data: response.data };
    } catch (error) {
      this.logger.error(`Error enviando imagen a ${numero}:`, error.message);
      throw new BadRequestException('Error al enviar imagen por WhatsApp');
    }
  }

  // EXTRAER BASE64 DE UN MENSAJE MULTIMEDIA DESDE EVOLUTION API
  async getBase64FromMedia(messageData: any): Promise<{ base64?: string; mimetype?: string } | null> {
    try {
      const payload = {
        message: {
          key: messageData.key || {},
          message: messageData.message || {},
        },
        convertToMp4: false,
      };

      const response = await this.evolutionApi.post(
        `/chat/getBase64FromMediaMessage/${this.instanceName}`,
        payload,
      );

      const base64 = response.data?.base64 || response.data?.data?.base64;
      const mimetype = response.data?.mimetype || response.data?.data?.mimetype || 'image/jpeg';

      if (base64) {
        return {
          base64,
          mimetype,
        };
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`No se pudo obtener base64 de media desde Evolution API: ${err.message}`);
      return null;
    }
  }

  // ENVIAR MENSAJE CON BOTONES (Para interacción)
  async sendButtonMessage(
    numero: string,
    mensaje: string,
    botones: { texto: string; id: string }[],
  ) {
    try {
      const isJid = numero.includes('@');
      const targetNumber = isJid ? numero.trim() : numero.replace(/\D/g, '');

      if (!(await this.isWithinSendingHours())) {
        await this.enqueueMessage(targetNumber, mensaje, 'botones');
        return { success: false, message: 'Mensaje encolado (fuera de horario)' };
      }

      const response = await this.evolutionApi.post(
        `/message/sendButtons/${this.instanceName}`,
        {
          number: targetNumber,
          text: mensaje,
          buttons: botones.map((b) => ({
            buttonId: b.id,
            buttonText: { displayText: b.texto },
            type: 1,
          })),
        },
      );

      await this.logNotification(targetNumber, mensaje, 'whatsapp', 'enviado');
      return { success: true, data: response.data };
    } catch (error) {
      this.logger.error(`Error enviando botones a ${numero}:`, error.message);
      throw new BadRequestException('Error al enviar botones por WhatsApp');
    }
  }

  // ============================================
  // MÉTODOS ESPECÍFICOS DEL NEGOCIO
  // ============================================

  // ENVIAR MENSAJE DE ENTREGA DE CUENTAS
  async sendDeliveryMessage(
    whatsapp: string,
    nombreCliente: string,
    suscripciones: any[],
  ) {
    const config = await this.getConfig();
    let mensaje = config.plantillaEntrega || this.getDefaultDeliveryTemplate();

    // Reemplazar variables
    mensaje = mensaje.replace('{nombre_cliente}', nombreCliente);
    mensaje = mensaje.replace('{nombre_marca}', config.nombreRemitente || 'MezaStreaming');

    // Construir lista de cuentas
    let cuentasTexto = '';
    suscripciones.forEach((sub, i) => {
      cuentasTexto += `\n\n*${i + 1}. ${sub.plan.service.nombre} - ${sub.plan.nombrePlan}*`;
      cuentasTexto += `\n📧 Email: ${sub.account.emailCuenta}`;
      cuentasTexto += `\n🔑 Contraseña: ${sub.account.passwordCuenta}`;
      if (sub.account.perfilAsignado) {
        cuentasTexto += `\n👤 Perfil: ${sub.account.perfilAsignado}`;
      }
      if (sub.account.pinPerfil) {
        cuentasTexto += `\n🔢 PIN: ${sub.account.pinPerfil}`;
      }
      cuentasTexto += `\n📅 Vence: ${new Date(sub.fechaVencimiento).toLocaleDateString()}`;
    });

    mensaje = mensaje.replace('{lista_cuentas}', cuentasTexto);

    return this.sendTextMessage(whatsapp, mensaje, true);
  }

  // ENVIAR RECORDATORIO DE RENOVACIÓN (7 días antes)
  async sendRenewalReminder7d(whatsapp: string, nombreCliente: string, servicio: string, fechaVencimiento: Date) {
    const config = await this.getConfig();
    let mensaje = config.plantillaRecordatorio7d || this.getDefaultReminder7dTemplate();

    mensaje = mensaje.replace('{nombre_cliente}', nombreCliente);
    mensaje = mensaje.replace('{servicio}', servicio);
    mensaje = mensaje.replace('{fecha_vencimiento}', fechaVencimiento.toLocaleDateString());
    mensaje = mensaje.replace('{link_renovacion}', 'https://tu-marca.com/renovar');

    return this.sendTextMessage(whatsapp, mensaje);
  }

  // ENVIAR ALERTA CRÍTICA (1 día antes)
  async sendRenewalReminder1d(whatsapp: string, nombreCliente: string, servicio: string, fechaVencimiento: Date) {
    const config = await this.getConfig();
    let mensaje = config.plantillaRecordatorio1d || this.getDefaultReminder1dTemplate();

    mensaje = mensaje.replace('{nombre_cliente}', nombreCliente);
    mensaje = mensaje.replace('{servicio}', servicio);
    mensaje = mensaje.replace('{fecha_vencimiento}', fechaVencimiento.toLocaleDateString());
    mensaje = mensaje.replace('{link_renovacion}', 'https://tu-marca.com/renovar');

    return this.sendTextMessage(whatsapp, mensaje);
  }

  // ENVIAR MENSAJE DE REEMPLAZO (Garantía)
  async sendWarrantyReplacementMessage(
    whatsapp: string,
    nombreCliente: string,
    nuevaSuscripcion: any,
  ) {
    const mensaje = `¡Hola ${nombreCliente}! ✅\n\nTu cuenta ha sido reemplazada exitosamente:\n\n*${nuevaSuscripcion.plan.service.nombre} - ${nuevaSuscripcion.plan.nombrePlan}*\n📧 Email: ${nuevaSuscripcion.account.emailCuenta}\n🔑 Contraseña: ${nuevaSuscripcion.account.passwordCuenta}\n👤 Perfil: ${nuevaSuscripcion.account.perfilAsignado || 'N/A'}\n\n⚠️ Recuerda no cambiar la contraseña ni el PIN.\n\n¡A disfrutar! 🍿`;

    return this.sendTextMessage(whatsapp, mensaje, true);
  }

  // ============================================
  // GESTIÓN DE CONFIGURACIÓN
  // ============================================

  // OBTENER CONFIGURACIÓN DE WHATSAPP
  async getConfig() {
    let config = await this.prisma.whatsappConfig.findFirst();
    const systemSetting = await this.prisma.systemSetting.findUnique({ where: { id: 'singleton' } }).catch(() => null);

    if (!config) {
      // Crear configuración por defecto si no existe
      config = await this.prisma.whatsappConfig.create({
        data: {
          nombreConfig: 'Principal',
          nombreRemitente: systemSetting?.nombrePlataforma || 'MezaStreaming',
          numeroWhatsapp: systemSetting?.whatsappSoporte || '+573001234567',
          zonaHoraria: 'America/Bogota',
          horaInicio: '09:00:00',
          horaFin: '20:00:00',
          notificacionesActivas: false,
          plantillaEntrega: this.getDefaultDeliveryTemplate(),
          plantillaRecordatorio7d: this.getDefaultReminder7dTemplate(),
          plantillaRecordatorio1d: this.getDefaultReminder1dTemplate(),
          plantillaRecuperacion3d: this.getDefaultRecoveryTemplate(),
        },
      });
    } else if ((!config.numeroWhatsapp || !config.nombreRemitente) && systemSetting) {
      // Si existen campos vacíos, sincronizar con systemSetting
      config = await this.prisma.whatsappConfig.update({
        where: { id: config.id },
        data: {
          nombreRemitente: config.nombreRemitente || systemSetting.nombrePlataforma || 'MezaStreaming',
          numeroWhatsapp: config.numeroWhatsapp || systemSetting.whatsappSoporte || '+573001234567',
        },
      });
    }
    return config;
  }

  // ACTUALIZAR CONFIGURACIÓN
  async updateConfig(dto: any) {
    const config = await this.getConfig();
    const { id, updatedAt, createdAt, ...data } = dto || {};
    const updated = await this.prisma.whatsappConfig.update({
      where: { id: config.id },
      data,
    });

    // Sincronizar recíprocamente con SystemSetting si se actualizan nombre o número
    if (data.numeroWhatsapp || data.nombreRemitente) {
      try {
        await this.prisma.systemSetting.upsert({
          where: { id: 'singleton' },
          update: {
            ...(data.numeroWhatsapp ? { whatsappSoporte: data.numeroWhatsapp } : {}),
            ...(data.nombreRemitente ? { nombrePlataforma: data.nombreRemitente } : {}),
          },
          create: {
            id: 'singleton',
            whatsappSoporte: data.numeroWhatsapp || '+573001234567',
            nombrePlataforma: data.nombreRemitente || 'MezaStreaming',
          },
        });
      } catch (err: any) {
        this.logger.warn(`No se pudo sincronizar SystemSetting: ${err.message}`);
      }
    }

    return updated;
  }

  // ============================================
  // GESTIÓN DE CONFIGURACIÓN DEL CHATBOT IA
  // ============================================

  // OBTENER CONFIGURACIÓN DEL CHATBOT
  async getChatbotConfig(): Promise<any> {
    const config = await this.getConfig();
    const raw = (config as any).chatbotConfig || {};

    return {
      activo: raw.activo !== false,
      nombreBot: raw.nombreBot || 'StreamBot',
      modoOperacion: raw.modoOperacion || 'hybrid', // hybrid, menu_only, ai_only
      palabrasClaveMenu: Array.isArray(raw.palabrasClaveMenu) && raw.palabrasClaveMenu.length > 0
        ? raw.palabrasClaveMenu
        : ['menu', 'hola', 'inicio', 'bot', 'ayuda'],
      takeoverHumanoActivo: raw.takeoverHumanoActivo !== false,
      tiempoExpiracionSesionMin: raw.tiempoExpiracionSesionMin || 30,

      // Módulos
      moduloCatalogoActivo: raw.moduloCatalogoActivo !== false,
      moduloCuentasActivo: raw.moduloCuentasActivo !== false,
      moduloGarantiaActivo: raw.moduloGarantiaActivo !== false,
      moduloRegistroActivo: raw.moduloRegistroActivo !== false,
      moduloVentasActivo: raw.moduloVentasActivo !== false,

      // Anti-Baneo & Control de Números (Protección WhatsApp)
      antiBanActivo: raw.antiBanActivo !== false,
      delayMinMs: raw.delayMinMs ?? 1500,
      delayMaxMs: raw.delayMaxMs ?? 3500,
      simularTipeo: raw.simularTipeo !== false,
      maxMensajesPorMinutoPorUsuario: raw.maxMensajesPorMinutoPorUsuario ?? 8,
      modoListaBlanca: Boolean(raw.modoListaBlanca),
      numerosAutorizados: Array.isArray(raw.numerosAutorizados) ? raw.numerosAutorizados : [],
      numerosBloqueados: Array.isArray(raw.numerosBloqueados) ? raw.numerosBloqueados : [],

      // Reglas de Negocio
      reglaStock10Min: raw.reglaStock10Min !== false,
      reglaPrivacidadEstricta: raw.reglaPrivacidadEstricta !== false,
      reglaRegistroPromociones: raw.reglaRegistroPromociones !== false,
      reglaVentasSimplificada: raw.reglaVentasSimplificada !== false,

      // Ollama LLM
      ollamaUrl: raw.ollamaUrl || this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434'),
      ollamaModel: raw.ollamaModel || this.configService.get<string>('OLLAMA_MODEL', 'qwen2.5:7b'),
      temperatura: typeof raw.temperatura === 'number' ? raw.temperatura : 0.5,
      maxTokens: typeof raw.maxTokens === 'number' ? raw.maxTokens : 350,
      systemPromptPersonalizado:
        raw.systemPromptPersonalizado ||
        'Saluda siempre con calidez y profesionalismo.\n' +
        '1. VERACIDAD TOTAL: Jamás inventes plataformas ni precios fuera del catálogo suministrado.\n' +
        '2. STOCK Y 10 MINUTOS: Si un servicio no tiene stock inmediato, indica que se lo gestionamos y activamos en un plazo máximo de no más de 10 minutos tras confirmar su pago.\n' +
        '3. CLIENTES NUEVOS: Invítalos a registrarse para obtener promociones y descuentos. Solicita únicamente nombre completo y correo electrónico.\n' +
        '4. VENTAS Y PAGOS: Menciona únicamente Nequi, Daviplata o Bancolombia, y pide captura del comprobante de transferencia.\n' +
        '5. GARANTÍA: Recuerda que todas las cuentas tienen garantía total siempre que no alteren correo ni contraseña.\n' +
        '6. Responde en máximo 2 a 3 párrafos cortos, con negritas y emojis estratégicos.',
      contextoAdicional:
        raw.contextoAdicional ||
        '- Pagos oficiales: Nequi, Daviplata y Bancolombia (solicitar comprobante para despacho).\n' +
        '- Horario de atención humana: 8:00 AM a 10:00 PM. El bot opera 24/7.\n' +
        '- Garantía: 100% durante el tiempo contratado. No cambiar correo ni clave maestra.\n' +
        '- Compromiso de entrega: Cuentas sin stock inmediato se activan en un máximo de 10 minutos.',
      faqs: Array.isArray(raw.faqs) && raw.faqs.length > 0 ? raw.faqs : [
        {
          id: 'faq-1',
          pregunta: '¿Cuáles son los métodos de pago aceptados?',
          respuesta: 'Aceptamos transferencias bancarias por Nequi, Daviplata y Bancolombia. Una vez realizada la transferencia, nos envías el comprobante para entrega inmediata.',
          activo: true,
        },
        {
          id: 'faq-2',
          pregunta: '¿Qué garantía tienen las cuentas?',
          respuesta: 'Todas nuestras pantallas cuentan con garantía total durante el periodo contratado, siempre y cuando no se modifiquen correos ni contraseñas.',
          activo: true,
        },
        {
          id: 'faq-3',
          pregunta: '¿Qué pasa si una cuenta no tiene entrega inmediata?',
          respuesta: 'Te la gestionamos y activamos en un plazo máximo de no más de 10 minutos tras confirmar tu pedido.',
          activo: true,
        },
        {
          id: 'faq-4',
          pregunta: '¿Puedo comprar siendo cliente nuevo?',
          respuesta: '¡Por supuesto! Te registramos en solo 30 segundos con tu nombre y correo para que aproveches descuentos especiales y garantía oficial.',
          activo: true,
        },
      ],
      promptsPersonalizados: Array.isArray(raw.promptsPersonalizados) ? raw.promptsPersonalizados : [
        {
          id: 'prompt-1',
          titulo: '1. Veracidad Estricta & Cero Alucinación',
          categoria: 'anti_alucinacion',
          contenido:
            'NUNCA inventes plataformas, precios, enlaces de pago ficticios ni cuentas que no figuren explícitamente en el catálogo suministrado. Si el cliente solicita información que no posees, responde honestamente: "En este momento no tengo esa información exacta en catálogo, pero con gusto te comunico con un asesor humano para ayudarte."',
          activo: true,
        },
        {
          id: 'prompt-2',
          titulo: '2. Identificación Única por Número de WhatsApp',
          categoria: 'cuentas',
          contenido:
            'Los clientes en el sistema se identifican y consultan ÚNICAMENTE por su número telefónico de WhatsApp emisor, NUNCA por su nombre. Solo puedes consultar y revelar cuentas, contraseñas o pedidos asociados estrictamente al número de WhatsApp desde el cual te escriben. Jamás muestres datos de terceros.',
          activo: true,
        },
        {
          id: 'prompt-3',
          titulo: '3. Regla de Stock & Compromiso de 10 Minutos',
          categoria: 'ventas',
          contenido:
            'Si el cliente pregunta por un servicio o pantalla que tiene stock disponible, confirma entrega inmediata tras el pago. Si el servicio NO tiene stock inmediato o está agotado, DEBES indicar con total amabilidad y seguridad: "Actualmente no contamos con entrega inmediata para este servicio, pero no te preocupes: te la gestionamos y activamos en un plazo máximo de no más de 10 minutos garantizado tras confirmar tu compra." NUNCA digas que no vendemos una cuenta si está en el catálogo.',
          activo: true,
        },
        {
          id: 'prompt-4',
          titulo: '4. Captación y Registro de Clientes Nuevos',
          categoria: 'ventas',
          contenido:
            'Si el cliente no está registrado en el sistema, invítalo con entusiasmo a registrarse para acceder a descuentos exclusivos en renovaciones, promociones y respaldo de garantía. Para registrarlo, solicita únicamente su Nombre completo y Correo electrónico (su teléfono ya es su WhatsApp actual). Si es cliente antiguo, salúdalo por su nombre y continúa con su compra sin pedirle datos redundantes.',
          activo: true,
        },
        {
          id: 'prompt-5',
          titulo: '5. Flujo de Ventas y Medios de Pago Oficiales',
          categoria: 'ventas',
          contenido:
            'Para cobros y ventas, menciona ÚNICAMENTE los métodos oficiales: Nequi, Daviplata o Bancolombia. Indica el valor total exacto en pesos colombianos ($ COP) y solicita siempre la captura o comprobante de la transferencia para procesar la entrega. No inventes otros bancos, PayPal ni tarjetas directas.',
          activo: true,
        },
        {
          id: 'prompt-6',
          titulo: '6. Términos de Garantía y Soporte Técnico',
          categoria: 'garantias',
          contenido:
            'Todas las cuentas y pantallas cuentan con garantía total durante el periodo contratado (30 días). La única condición indispensable para mantener la garantía es que el cliente no debe modificar el correo electrónico de la cuenta ni la contraseña maestra. Para soporte o caídas, pide el correo de la cuenta y foto del error.',
          activo: true,
        },
      ],
    };
  }

  // ACTUALIZAR CONFIGURACIÓN DEL CHATBOT
  async updateChatbotConfig(newConfig: any) {
    const config = await this.getConfig();
    const current = await this.getChatbotConfig();
    const merged = { ...current, ...newConfig };

    await this.prisma.whatsappConfig.update({
      where: { id: config.id },
      data: {
        chatbotConfig: merged,
      },
    });

    return merged;
  }

  // ACTIVAR/DESACTIVAR NOTIFICACIONES
  async toggleNotifications(activar: boolean) {
    const config = await this.getConfig();
    return this.prisma.whatsappConfig.update({
      where: { id: config.id },
      data: { notificacionesActivas: activar },
    });
  }

  // ============================================
  // CONEXIÓN Y ESTADO
  // ============================================

  // CREAR INSTANCIA DE WHATSAPP (Primera vez)
  async createInstance() {
    try {
      const response = await this.evolutionApi.post('/instance/create', {
        instanceName: this.instanceName,
        qrcode: true,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Error creando instancia:', error.message);
      throw new BadRequestException('Error al crear instancia de WhatsApp');
    }
  }

  // OBTENER QR PARA CONECTAR
  async getQrCode() {
    try {
      const response = await this.evolutionApi.get(`/instance/connect/${this.instanceName}`);
      const state = response.data?.instance?.state || response.data?.state;
      if (state === 'open') {
        return {
          state: 'open',
          connected: true,
          message: 'WhatsApp ya está conectado y listo para operar.',
          ...response.data,
        };
      }
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        try {
          const createRes = await this.evolutionApi.post('/instance/create', {
            instanceName: this.instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          });
          return createRes.data?.qrcode || createRes.data;
        } catch (createErr) {
          this.logger.error('Error auto-creando instancia:', createErr.message);
        }
      }
      this.logger.error('Error obteniendo QR:', error.message);
      throw new BadRequestException('Error al obtener código QR (Verifica que Evolution API esté encendida)');
    }
  }

  // VERIFICAR ESTADO DE CONEXIÓN
  async getConnectionState() {
    try {
      const response = await this.evolutionApi.get(`/instance/connectionState/${this.instanceName}`);
      const state = response.data?.instance?.state || response.data?.state || 'disconnected';
      let profile = null;

      if (state === 'open') {
        try {
          const fetchRes = await this.evolutionApi.get('/instance/fetchInstances');
          const inst = Array.isArray(fetchRes.data)
            ? fetchRes.data.find((i: any) => i.name === this.instanceName)
            : null;
          if (inst) {
            profile = {
              name: inst.profileName,
              number: inst.ownerJid ? inst.ownerJid.split('@')[0] : null,
              ownerJid: inst.ownerJid,
              profilePicUrl: inst.profilePicUrl || null,
            };
          }
        } catch (fetchErr) {
          this.logger.warn('No se pudo obtener el perfil de la instancia conectada:', fetchErr.message);
        }
      }

      return {
        state,
        connected: state === 'open',
        profile,
        instanceName: this.instanceName,
        raw: response.data,
      };
    } catch (error) {
      return { state: 'disconnected', connected: false, error: error.message };
    }
  }

  // DESCONECTAR INSTANCIA
  async logout() {
    try {
      await this.evolutionApi.delete(`/instance/logout/${this.instanceName}`);
      return { success: true, message: 'Sesión de WhatsApp desconectada exitosamente' };
    } catch (error) {
      this.logger.error('Error cerrando sesión de WhatsApp:', error.message);
      throw new BadRequestException('Error al desconectar la sesión de WhatsApp');
    }
  }

  // CONFIGURAR WEBHOOK EN EVOLUTION API
  async configureWebhook(targetUrl?: string) {
    try {
      const webhookUrl =
        targetUrl ||
        this.configService.get<string>('WHATSAPP_WEBHOOK_URL') ||
        'http://host.docker.internal:3001/api/whatsapp/webhook';

      const response = await this.evolutionApi.post(`/webhook/set/${this.instanceName}`, {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: [
            'MESSAGES_UPSERT',
            'CONNECTION_UPDATE',
          ],
        },
      });
      this.logger.log(`Webhook configurado exitosamente en Evolution API hacia ${webhookUrl}`);
      return { success: true, data: response.data, webhookUrl };
    } catch (error) {
      this.logger.error('Error configurando webhook en Evolution API:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // TAREAS AUTOMÁTICAS (CRON JOBS)
  // ============================================

  // PROGRAMAR TAREAS AUTOMÁTICAS
  private scheduleAutomaticTasks() {
    // Enviar recordatorios de renovación cada día a las 10:00 AM
    cron.schedule('0 10 * * *', async () => {
      this.logger.log('Ejecutando recordatorios de renovación...');
      await this.sendRenewalReminders();
    });

    // Procesar cola de mensajes cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
      await this.processMessageQueue();
    });
  }

  // ENVIAR RECORDATORIOS DE RENOVACIÓN
  private async sendRenewalReminders() {
    const config = await this.getConfig();
    if (!config.notificacionesActivas) {
      this.logger.log('Notificaciones desactivadas, omitiendo recordatorios');
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // 1. Recordatorio de 7 días
    const en7Dias = new Date(hoy);
    en7Dias.setDate(en7Dias.getDate() + 7);

    const suscripciones7d = await this.prisma.subscription.findMany({
      where: {
        estado: 'ACTIVA',
        fechaVencimiento: en7Dias,
      },
      include: {
        customer: { include: { user: true } },
        plan: { include: { service: true } },
      },
    });

    for (const sub of suscripciones7d) {
      if (sub.customer.optOutWhatsapp) continue;
      
      try {
        await this.sendRenewalReminder7d(
          sub.customer.whatsapp,
          sub.customer.user.nombre,
          sub.plan.service.nombre,
          sub.fechaVencimiento,
        );
        // Delay aleatorio para simular comportamiento humano
        await this.delay(Math.random() * 30000 + 15000); // 15-45 segundos
      } catch (error) {
        this.logger.error(`Error enviando recordatorio 7d a ${sub.customer.whatsapp}`);
      }
    }

    // 2. Recordatorio de 1 día
    const en1Dia = new Date(hoy);
    en1Dia.setDate(en1Dia.getDate() + 1);

    const suscripciones1d = await this.prisma.subscription.findMany({
      where: {
        estado: 'ACTIVA',
        fechaVencimiento: en1Dia,
      },
      include: {
        customer: { include: { user: true } },
        plan: { include: { service: true } },
      },
    });

    for (const sub of suscripciones1d) {
      if (sub.customer.optOutWhatsapp) continue;
      
      try {
        await this.sendRenewalReminder1d(
          sub.customer.whatsapp,
          sub.customer.user.nombre,
          sub.plan.service.nombre,
          sub.fechaVencimiento,
        );
        await this.delay(Math.random() * 30000 + 15000);
      } catch (error) {
        this.logger.error(`Error enviando recordatorio 1d a ${sub.customer.whatsapp}`);
      }
    }

    this.logger.log(`Recordatorios enviados: ${suscripciones7d.length} (7d) + ${suscripciones1d.length} (1d)`);
  }

  // ============================================
  // COLA DE MENSAJES
  // ============================================

  // ENCOLAR MENSAJE (Cuando está fuera de horario)
  private async enqueueMessage(
    numero: string,
    mensaje: string,
    tipo: string,
    imagenUrl?: string,
  ) {
    const cleanNumber = numero.replace(/\D/g, '');
    const customer = await this.prisma.customer.findFirst({
      where: { whatsapp: { contains: cleanNumber.slice(-8) } },
    });
    if (!customer) {
      this.logger.warn(`No se encontró cliente registrado para encolar mensaje al número ${numero}`);
      return;
    }
    await this.prisma.notificationLog.create({
      data: {
        customerId: customer.id,
        tipoEvento: `encolado_${tipo}`,
        canal: 'whatsapp',
        mensajeEnviado: mensaje,
        estadoEnvio: 'encolado',
      },
    });
  }

  // PROCESAR COLA DE MENSAJES
  private async processMessageQueue() {
    const mensajesEncolados = await this.prisma.notificationLog.findMany({
      where: { estadoEnvio: 'encolado' },
      include: {
        customer: { select: { whatsapp: true } },
      },
      take: 10, // Procesar de 10 en 10
    });

    for (const msg of mensajesEncolados) {
      try {
        const numero = msg.customer?.whatsapp;
        if (!numero) {
          this.logger.warn(`Mensaje encolado ${msg.id} sin número de WhatsApp. Omitiendo.`);
          continue;
        }
        await this.sendTextMessage(numero, msg.mensajeEnviado, true);
        await this.prisma.notificationLog.update({
          where: { id: msg.id },
          data: { estadoEnvio: 'enviado' },
        });
        await this.delay(5000); // 5 segundos entre cada envío
      } catch (error) {
        this.logger.error(`Error procesando mensaje encolado ${msg.id}`);
      }
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  // VERIFICAR HORARIO DE ENVÍO
  private async isWithinSendingHours(): Promise<boolean> {
    const config = await this.getConfig();
    const now = new Date();
    const horaActual = now.toTimeString().split(' ')[0]; // HH:MM:SS

    return horaActual >= config.horaInicio && horaActual <= config.horaFin;
  }

  // REGISTRAR NOTIFICACIÓN EN LOGS
  private async logNotification(
    numero: string,
    mensaje: string,
    canal: string,
    estado: string,
  ) {
    try {
      const cleanNumber = numero.replace(/\D/g, '');
      const customer = await this.prisma.customer.findFirst({
        where: { whatsapp: { contains: cleanNumber.slice(-8) } },
      });

      if (!customer) {
        this.logger.log(`Mensaje registrado para ${numero} (${estado}), sin perfil de cliente.`);
        return;
      }

      await this.prisma.notificationLog.create({
        data: {
          customerId: customer.id,
          tipoEvento: 'mensaje_manual',
          canal,
          mensajeEnviado: mensaje,
          estadoEnvio: estado,
        },
      });
    } catch (e) {
      this.logger.warn(`No se pudo registrar log de notificación: ${e.message}`);
    }
  }

  // DELAY HELPER
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // PLANTILLAS POR DEFECTO
  // ============================================

  private getDefaultDeliveryTemplate(): string {
    return `¡Hola {nombre_cliente}! 🎉 Gracias por tu compra en {nombre_marca}.

Aquí tienes los datos de tu suscripción:
{lista_cuentas}

⚠️ *REGLAS IMPORTANTES PARA MANTENER TU GARANTÍA:*
1️⃣ No cambies el correo ni la contraseña.
2️⃣ No crees ni modifiques el PIN del perfil.
3️⃣ Si la plataforma pide verificar identidad, avísanos de inmediato.

¿Tienes dudas? Responde a este mensaje y te atendemos. ¡A disfrutar! 🍿`;
  }

  private getDefaultReminder7dTemplate(): string {
    return `¡Hola {nombre_cliente}! 👋 Esperamos que estés disfrutando tu *{servicio}*.

Te recordamos que tu suscripción vence el próximo *{fecha_vencimiento}* (en 7 días).

Para que no pierdas el acceso ni tu perfil, puedes renovar fácilmente aquí:
🔗 {link_renovacion}

Si ya realizaste el pago, ignora este mensaje. ¡Gracias por preferirnos! ✨`;
  }

  private getDefaultReminder1dTemplate(): string {
    return `⚠️ *ATENCIÓN {nombre_cliente}* ⚠️

Tu cuenta de *{servicio}* vence HOY a las 23:59.
Para evitar que el sistema libere la cuenta y pierdas tu perfil, realiza tu renovación ahora:

🔗 {link_renovacion}

Responde "YA PAGUÉ" y envía tu comprobante para extender tu acceso de inmediato. ⏳`;
  }

  private getDefaultRecoveryTemplate(): string {
    return `Hola {nombre_cliente}, notamos que tu suscripción a *{servicio}* venció hace 3 días y el sistema está a punto de reasignar tu perfil. 🥺

¿Deseas recuperarlo? Aún podemos reactivarlo por el mismo precio si renuevas en las próximas 24 horas:
🔗 {link_renovacion}

Si no deseas continuar, no hay problema. ¡Esperamos verte de nuevo pronto! 👋`;
  }
}