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
      const cleanNumber = numero.replace(/\D/g, '');

      // Validar horario de envío si no es forzado (ej: entregas inmediatas de compras)
      if (!forceSend && !(await this.isWithinSendingHours())) {
        this.logger.warn(`Mensaje a ${cleanNumber} encolado (fuera de horario)`);
        await this.enqueueMessage(cleanNumber, mensaje, 'texto');
        return { success: false, message: 'Mensaje encolado (fuera de horario)' };
      }

      const response = await this.evolutionApi.post(
        `/message/sendText/${this.instanceName}`,
        {
          number: cleanNumber,
          text: mensaje,
        },
      );

      // Registrar en logs
      await this.logNotification(cleanNumber, mensaje, 'whatsapp', 'enviado');

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
      if (!(await this.isWithinSendingHours())) {
        await this.enqueueMessage(numero, caption, 'imagen', imagenUrl);
        return { success: false, message: 'Mensaje encolado (fuera de horario)' };
      }

      const response = await this.evolutionApi.post(
        `/message/sendMedia/${this.instanceName}`,
        {
          number: numero,
          mediatype: 'image',
          mediaUrl: imagenUrl,
          caption: caption,
        },
      );

      await this.logNotification(numero, caption, 'whatsapp', 'enviado');
      return { success: true, data: response.data };
    } catch (error) {
      this.logger.error(`Error enviando imagen a ${numero}:`, error.message);
      throw new BadRequestException('Error al enviar imagen por WhatsApp');
    }
  }

  // ENVIAR MENSAJE CON BOTONES (Para interacción)
  async sendButtonMessage(
    numero: string,
    mensaje: string,
    botones: { texto: string; id: string }[],
  ) {
    try {
      if (!(await this.isWithinSendingHours())) {
        await this.enqueueMessage(numero, mensaje, 'botones');
        return { success: false, message: 'Mensaje encolado (fuera de horario)' };
      }

      const response = await this.evolutionApi.post(
        `/message/sendButtons/${this.instanceName}`,
        {
          number: numero,
          text: mensaje,
          buttons: botones.map((b) => ({
            buttonId: b.id,
            buttonText: { displayText: b.texto },
            type: 1,
          })),
        },
      );

      await this.logNotification(numero, mensaje, 'whatsapp', 'enviado');
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
    mensaje = mensaje.replace('{nombre_marca}', 'Tu Marca');

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
          nombreRemitente: systemSetting?.nombrePlataforma || 'StreamControl',
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
          nombreRemitente: config.nombreRemitente || systemSetting.nombrePlataforma || 'StreamControl',
          numeroWhatsapp: config.numeroWhatsapp || systemSetting.whatsappSoporte || '+573001234567',
        },
      });
    }
    return config;
  }

  // ACTUALIZAR CONFIGURACIÓN
  async updateConfig(data: any) {
    const config = await this.getConfig();
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
            nombrePlataforma: data.nombreRemitente || 'StreamControl',
          },
        });
      } catch (err: any) {
        this.logger.warn(`No se pudo sincronizar SystemSetting: ${err.message}`);
      }
    }

    return updated;
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