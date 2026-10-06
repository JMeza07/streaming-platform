import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { exec } from 'child_process';

interface UserSession {
  jid: string;
  step:
    | 'MENU'
    | 'CATALOG'
    | 'SUPPORT'
    | 'WARRANTY'
    | 'HUMAN_SUPPORT'
    | 'REGISTER_NAME'
    | 'REGISTER_EMAIL'
    | 'BUY_SELECT_PLAN'
    | 'BUY_REGISTER_NAME'
    | 'BUY_REGISTER_EMAIL'
    | 'BUY_PAY_METHOD'
    | 'AWAITING_PAYMENT_RECEIPT'
    | 'AI_CHAT';
  humanTakeover: boolean;
  selectedPlanId?: string;
  selectedPlanName?: string;
  selectedPlanPrice?: number;
  selectedPlanStock?: number;
  tempRegisterName?: string;
  tempRegisterEmail?: string;
  customerId?: string;
  pendingOrderId?: string;
  lastActive: number;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private sessions = new Map<string, UserSession>();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  private lidCache = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  // OBTENER NOMBRE DE LA PLATAFORMA CONFIGURADO EN EL PANEL DEL SISTEMA
  async getPlatformName(): Promise<string> {
    try {
      const setting = await this.prisma.systemSetting.findFirst();
      if (setting?.nombrePlataforma && setting.nombrePlataforma.trim().length > 0) {
        return setting.nombrePlataforma.trim();
      }
    } catch {}
    return 'MezaStreaming';
  }

  // ============================================================
  // 1. GESTIÓN DEL BOT COMO USUARIO DEL SISTEMA (RBAC)
  // ============================================================
  async getBotUser(): Promise<any> {
    let botUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: 'bot@streamcontrol.internal' },
          { email: 'bot@stream.com' },
        ],
      },
    });

    if (!botUser) {
      const platformName = await this.getPlatformName();
      const passwordHash = await bcrypt.hash('StreamBot_Secret_Pass_2025!', 10);
      botUser = await this.prisma.user.create({
        data: {
          nombre: `${platformName} Bot (Asistente IA WhatsApp)`,
          email: 'bot@streamcontrol.internal',
          passwordHash,
          phone: '+573245967142',
          rol: UserRole.ASESOR_COMERCIAL,
          activo: true,
          modulosPermitidos: [
            '/admin/catalog',
            '/admin/sales-accounts',
            '/admin/warranty',
            '/admin/orders',
            '/admin/inventory',
            '/admin/customers',
          ],
        },
      });

      const uniqueCode = 'BOT' + Math.floor(1000 + Math.random() * 9000);
      await this.prisma.affiliate.create({
        data: {
          userId: botUser.id,
          codigoReferido: uniqueCode,
        },
      }).catch(() => {});

      this.logger.log(`Usuario del sistema creado para el Bot: ${botUser.nombre} (${botUser.email})`);
    }

    return botUser;
  }

  // COMPROBACIÓN DE PERMISOS DINÁMICOS POR MÓDULO
  private hasModulePermission(botUser: any, modulePath: string): boolean {
    if (!botUser || !botUser.activo) return false;
    if (botUser.rol === UserRole.ADMIN) return true;
    const perms: string[] = botUser.modulosPermitidos || [];
    return perms.includes(modulePath);
  }

  // ============================================================
  // 2. PROCESADOR PRINCIPAL DE WEBHOOKS DE EVOLUTION API
  // ============================================================
  async processIncomingMessage(payload: any): Promise<void> {
    try {
      if (!payload) return;

      const eventType = String(payload.event || payload.type || '');
      if (eventType && !eventType.toLowerCase().includes('messages')) {
        return;
      }

      const rawData = payload.data || payload;
      const messageData = Array.isArray(rawData) ? rawData[0] : rawData;
      if (!messageData) return;

      const key = messageData.key || {};
      let remoteJid: string = key.remoteJid || messageData.remoteJid || '';

      if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) {
        return;
      }

      // Si es un LID de WhatsApp pero viene el número real en sender o participant
      if (remoteJid.includes('@lid')) {
        const altJid = messageData.sender || key.participant || messageData.participant || '';
        if (altJid && altJid.includes('@s.whatsapp.net')) {
          this.logger.log(`[Chatbot] Mapeando JID de dispositivo LID ${remoteJid} a teléfono ${altJid}`);
          remoteJid = altJid;
        }
      }

      const targetJid = remoteJid.trim();

      if (key.fromMe) {
        const session = this.getSession(targetJid);
        if (session && !session.humanTakeover) {
          session.humanTakeover = true;
          this.logger.log(`Operador humano tomó el control del chat con ${targetJid}`);
        }
        return;
      }

      const messageObj = messageData.message || {};
      const incomingText = (
        messageObj.conversation ||
        messageObj.extendedTextMessage?.text ||
        messageObj.buttonsResponseMessage?.selectedButtonId ||
        messageObj.listResponseMessage?.singleSelectReply?.selectedRowId ||
        messageObj.imageMessage?.caption ||
        messageObj.documentMessage?.caption ||
        messageData.body ||
        ''
      ).trim();

      const isImageMessage = Boolean(
        messageObj.imageMessage ||
        (messageObj.documentMessage && messageObj.documentMessage.mimetype?.startsWith('image/')) ||
        messageData.messageType === 'imageMessage' ||
        messageData.messageType === 'image' ||
        messageData.mediaType === 'image' ||
        (typeof messageData.base64 === 'string' && messageData.base64.length > 50)
      );

      if (!incomingText && !isImageMessage) return;

      const pushName: string = messageData.pushName || 'Cliente';
      this.logger.log(`[Chatbot] Mensaje de "${pushName}" (${targetJid}): "${incomingText}" ${isImageMessage ? '[IMAGEN ADJUNTA]' : ''}`);

      // 1. Obtener usuario del Bot y configuración avanzada del Chatbot
      const botUser = await this.getBotUser();
      const botConfig = await this.whatsappService.getChatbotConfig();
      const session = this.getSession(targetJid);

      if (!botUser.activo || !botConfig.activo) {
        this.logger.warn(`El bot está desactivado por el administrador.`);
        return;
      }

      // 2. SEGURIDAD ANTI-BANEO: Comprobar Lista Negra (Números Bloqueados / Spammers)
      const cleanPhone = targetJid.includes('@s.whatsapp.net')
        ? targetJid.split('@')[0].replace(/\D/g, '')
        : targetJid.replace(/\D/g, '');

      if (Array.isArray(botConfig.numerosBloqueados) && botConfig.numerosBloqueados.length > 0) {
        const isBlocked = botConfig.numerosBloqueados.some((num: string) => {
          const c = num.replace(/\D/g, '');
          return c.length >= 7 && (cleanPhone.includes(c) || c.includes(cleanPhone));
        });
        if (isBlocked) {
          this.logger.warn(`[Anti-Ban] Mensaje ignorado de número en lista negra: ${targetJid}`);
          return;
        }
      }

      // 3. SEGURIDAD ANTI-BANEO: Modo Lista Blanca (Solo Números Autorizados / Warmup)
      if (botConfig.modoListaBlanca && Array.isArray(botConfig.numerosAutorizados) && botConfig.numerosAutorizados.length > 0) {
        const isAuthorized = botConfig.numerosAutorizados.some((num: string) => {
          const c = num.replace(/\D/g, '');
          return c.length >= 7 && (cleanPhone.includes(c) || c.includes(cleanPhone));
        });
        if (!isAuthorized) {
          this.logger.debug(`[Anti-Ban] Modo Lista Blanca activo: ${targetJid} no está en números autorizados.`);
          return;
        }
      }

      // Reactivación si estaba en modo humano
      const normalizedText = incomingText.toLowerCase();
      if (session.humanTakeover) {
        const reactivationWords = botConfig.palabrasClaveMenu || ['bot', 'menu', 'activar bot'];
        if (reactivationWords.some((w: string) => normalizedText === w.toLowerCase() || normalizedText.includes(w.toLowerCase()))) {
          session.humanTakeover = false;
          session.step = 'MENU';
          await this.sendTyping(targetJid);
          await this.reply(targetJid, `🤖 *${botConfig.nombreBot || 'StreamBot'} reactivado.*\n¿En qué te podemos ayudar?`);
          const customer = await this.findCustomer(targetJid, messageData);
          await this.sendMenu(targetJid, customer?.user?.nombre || pushName, botUser, !!customer, customer);
          return;
        }
        return;
      }

      // 3. Buscar cliente estrictamente por su número de WhatsApp
      let customer = await this.findCustomer(targetJid, messageData);
      let clientName = customer?.user?.nombre || pushName;

      // 4. Procesar máquina de estados conversacional
      await this.handleUserFlow(
        session,
        incomingText,
        customer,
        clientName,
        botUser,
        targetJid,
        pushName,
        messageData,
        isImageMessage,
      );
    } catch (error: any) {
      this.logger.error(`Error procesando mensaje entrante: ${error.message}`, error.stack);
    }
  }

  // ============================================================
  // 3. MÁQUINA DE ESTADOS Y CONTROL DE PERMISOS
  // ============================================================
  private async handleUserFlow(
    session: UserSession,
    text: string,
    customer: any,
    clientName: string,
    botUser: any,
    targetJid: string,
    pushName: string,
    messageData?: any,
    isImageMessage?: boolean,
  ): Promise<void> {
    const cleanText = text.trim();
    const lower = cleanText.toLowerCase();

    // INTERCEPTAR IMAGEN (COMPROBANTE DE PAGO O SOPORTE ADJUNTO)
    if (isImageMessage) {
      await this.handleImageAttachment(
        session,
        customer,
        clientName,
        botUser,
        targetJid,
        pushName,
        messageData,
        cleanText,
      );
      return;
    }

    // SI ESTÁ ESPERANDO COMPROBANTE DE PAGO Y ENVIÓ TEXTO EN LUGAR DE IMAGEN
    if (session.step === 'AWAITING_PAYMENT_RECEIPT') {
      if (['menu', 'inicio', 'cancelar', 'reset'].includes(lower)) {
        session.step = 'MENU';
        session.pendingOrderId = undefined;
        await this.sendMenu(targetJid, clientName, botUser, !!customer, customer);
        return;
      }
      if (lower === '4' || lower === 'asesor' || lower === 'humano') {
        session.humanTakeover = true;
        session.step = 'HUMAN_SUPPORT';
        await this.sendTyping(targetJid);
        await this.reply(
          targetJid,
          `🧑‍💼 *Atención con Asesor Humano*\n\nHe transferido esta conversación a un asesor humano. Te asistiremos con tu orden pendiente en breve.\n\n_(Escribe *MENU* en cualquier momento para volver al bot)_`,
        );
        return;
      }

      await this.sendTyping(targetJid);
      await this.reply(
        targetJid,
        `📸 *Esperando tu comprobante de pago:*\n\n` +
        `Por favor envía la **foto o captura de pantalla del comprobante de transferencia** por este chat para asociarla a tu orden y proceder con la entrega de tus accesos.\n\n` +
        `_(Si deseas comunicarte con un asesor, responde *4*. Para cancelar o volver al inicio, escribe *Menú*)_`,
      );
      return;
    }

    const isEnteringData = [
      'REGISTER_NAME',
      'REGISTER_EMAIL',
      'BUY_REGISTER_NAME',
      'BUY_REGISTER_EMAIL',
    ].includes(session.step);

    if (!isEnteringData) {
      // Palabras clave universales y saludos para volver al menú
      const isGreeting = [
        'hola', 'buenas', 'buenos dias', 'buenos días', 'buenas tardes', 'buenas noches',
        'menu', 'menú', 'inicio', 'empezar', 'reset', 'opciones', 'hi', 'hello'
      ].some((g) => lower === g || lower.startsWith(g + ' ') || lower.startsWith(g + ',') || lower.startsWith(g + '!'));

      if (isGreeting) {
        session.step = 'MENU';
        await this.sendMenu(targetJid, clientName, botUser, !!customer, customer);
        return;
      }

      // Atajo global opción 1: Catálogo y Stock
      if (lower === '1' || lower === 'catalogo' || lower === 'catálogo' || lower === 'precios' || lower === 'precio') {
        session.step = 'CATALOG';
        await this.handleCatalogOption(targetJid, botUser);
        return;
      }

      // Atajo global opción 2: Consulta estricta de cuentas y suscripciones activas del cliente
      const isAccountQuery =
        lower === '2' ||
        [
          'mis cuentas', 'mis pantallas', 'mis servicios', 'mis accesos', 'que cuentas tengo',
          'cuales son mis cuentas', 'mis contraseñas', 'mis claves', 'mis suscripciones',
          'ver cuentas', 'mostrar cuentas', 'mis pines', 'mi pin', 'que tengo activo', 'soporte',
        ].some((q) => lower === q || lower.startsWith(q + ' ') || lower.includes(q));

      if (isAccountQuery) {
        session.step = 'SUPPORT';
        await this.handleSupportOption(targetJid, customer, clientName, botUser);
        return;
      }

      // Atajo global opción 3: Garantía
      if (lower === '3' || lower === 'garantia' || lower === 'garantía') {
        session.step = 'WARRANTY';
        await this.handleWarrantyOption(targetJid, customer, clientName, botUser);
        return;
      }

      // Atajo global opción 4: Humano
      if (lower === '4' || lower === 'humano' || lower === 'asesor' || lower === 'agente') {
        session.humanTakeover = true;
        session.step = 'HUMAN_SUPPORT';
        await this.sendTyping(targetJid);
        await this.reply(
          targetJid,
          `🧑‍💼 *Atención con Asesor Humano*\n\nHe transferido esta conversación a nuestro equipo de soporte humano. Un asesor te responderá directamente aquí en breve.\n\n_(Si deseas volver al menú interactivo en cualquier momento, escribe *BOT* o *MENU*)_`,
        );
        return;
      }

      // Atajo global opción 5: Registro
      if (lower === '5' || lower === 'registro' || lower === 'registrarme') {
        if (customer) {
          await this.sendTyping(targetJid);
          await this.reply(targetJid, `¡Ya estás registrado(a) en el sistema como *${customer.user.nombre}*! Puedes consultar tu catálogo (1) o tus cuentas (2).`);
          return;
        }
        session.step = 'REGISTER_NAME';
        await this.sendTyping(targetJid);
        await this.reply(
          targetJid,
          `📝 *Registro de Nuevo Cliente*\n\nPara acceder a promociones, descuentos preferenciales y garantía en tus pantallas, por favor escribe tu *Nombre y Apellido completo*:`,
        );
        return;
      }
    }

    // ==========================================================
    // FLUJO: REGISTRO DE CLIENTE NUEVO (OPCIÓN VOLUNTARIA)
    // ==========================================================
    if (session.step === 'REGISTER_NAME') {
      session.tempRegisterName = cleanText;
      session.step = 'REGISTER_EMAIL';
      await this.sendTyping(targetJid);
      await this.reply(
        targetJid,
        `¡Mucho gusto, *${cleanText}*! 👋\n\n` +
        `📧 *Correo electrónico (OPCIONAL):*\n` +
        `Si deseas asociar un correo para facturas y garantías, escríbelo aquí.\n` +
        `_(O responde *0* o *NO* para continuar sin correo)_:`,
      );
      return;
    }

    if (session.step === 'REGISTER_EMAIL') {
      const emailLower = cleanText.toLowerCase();
      const skipEmail = ['0', 'no', 'omitir', 'ninguno', 'sin correo', 'pasar', 'skip'].includes(emailLower);
      let validEmail: string | null = null;
      if (!skipEmail) {
        if (!this.isValidEmail(emailLower)) {
          await this.sendTyping(targetJid);
          await this.reply(
            targetJid,
            '⚠️ El formato del correo no es válido. Escribe un correo válido (ej: usuario@gmail.com) o responde *0* para omitirlo y continuar:',
          );
          return;
        }
        validEmail = emailLower;
      }

      session.tempRegisterEmail = validEmail || undefined;
      const createdCustomer = await this.registerNewCustomer(
        targetJid,
        session.tempRegisterName || pushName,
        validEmail,
      );
      session.customerId = createdCustomer.id;

      const platformName = await this.getPlatformName();
      session.step = 'MENU';
      await this.sendTyping(targetJid);
      await this.reply(
        targetJid,
        `🎉 *¡Registro completado exitosamente!*\n\n` +
        `Bienvenido(a) a la familia ${platformName}, *${createdCustomer.user.nombre}*.\n` +
        (createdCustomer.user.email ? `• Correo: ${createdCustomer.user.email}\n` : '') +
        `• WhatsApp (Clave Principal): +${createdCustomer.whatsapp}\n\n` +
        `Ahora cuentas con acceso a promociones exclusivas, descuentos preferenciales y soporte garantizado. 🚀`,
      );
      await this.sendMenu(targetJid, createdCustomer.user.nombre, botUser, true, createdCustomer);
      return;
    }

    // ==========================================================
    // FLUJO: COMPRA Y VENTA CON EL BOT
    // ==========================================================
    if (session.step === 'BUY_REGISTER_NAME') {
      session.tempRegisterName = cleanText;
      session.step = 'BUY_REGISTER_EMAIL';
      await this.sendTyping(targetJid);
      await this.reply(
        targetJid,
        `¡Perfecto, *${cleanText}*! 👋\n\n` +
        `📧 *Correo electrónico (OPCIONAL):*\n` +
        `Si deseas asociar un correo para comprobantes y garantías, escríbelo aquí.\n` +
        `_(O responde *0* o *NO* para continuar sin correo)_:`,
      );
      return;
    }

    if (session.step === 'BUY_REGISTER_EMAIL') {
      const emailLower = cleanText.toLowerCase();
      const skipEmail = ['0', 'no', 'omitir', 'ninguno', 'sin correo', 'pasar', 'skip'].includes(emailLower);
      let validEmail: string | null = null;
      if (!skipEmail) {
        if (!this.isValidEmail(emailLower)) {
          await this.sendTyping(targetJid);
          await this.reply(
            targetJid,
            '⚠️ Por favor escribe un correo válido (ej: usuario@gmail.com) o responde *0* para continuar sin correo:',
          );
          return;
        }
        validEmail = emailLower;
      }

      session.tempRegisterEmail = validEmail || undefined;
      const newCustomer = await this.registerNewCustomer(
        targetJid,
        session.tempRegisterName || pushName,
        validEmail,
      );
      session.customerId = newCustomer.id;

      // Proceder al método de pago
      session.step = 'BUY_PAY_METHOD';
      await this.sendPaymentOptions(targetJid, newCustomer, session, botUser);
      return;
    }

    if (session.step === 'BUY_PAY_METHOD') {
      let finalCustomer = customer;
      if (!finalCustomer && session.customerId) {
        finalCustomer = await this.prisma.customer.findUnique({
          where: { id: session.customerId },
          include: { user: true },
        });
      }
      if (!finalCustomer) {
        finalCustomer = await this.findCustomer(targetJid);
      }
      await this.processOrderRegistration(targetJid, cleanText, finalCustomer, session, botUser);
      return;
    }

    // ==========================================================
    // MENÚ PRINCIPAL
    // ==========================================================
    if (session.step === 'MENU') {
      // 1. Catálogo de Cuentas Disponibles
      if (lower === '1' || lower.includes('catalogo') || lower.includes('catálogo') || lower.includes('precios') || lower.includes('precio')) {
        session.step = 'CATALOG';
        await this.handleCatalogOption(targetJid, botUser);
        return;
      }

      // 2. Consulta de cuentas activas del usuario consultante (estricto)
      if (lower === '2' || lower.includes('soporte') || lower.includes('mis cuentas') || lower.includes('cuenta') || lower.includes('clave') || lower.includes('pin')) {
        session.step = 'SUPPORT';
        await this.handleSupportOption(targetJid, customer, clientName, botUser);
        return;
      }

      // 3. Reclamación de Garantía
      if (lower === '3' || lower.includes('garantia') || lower.includes('garantía') || lower.includes('falla') || lower.includes('caida') || lower.includes('no funciona')) {
        session.step = 'WARRANTY';
        await this.handleWarrantyOption(targetJid, customer, clientName, botUser);
        return;
      }

      // 4. Asesor Humano
      if (lower === '4' || lower.includes('humano') || lower.includes('asesor') || lower.includes('agente') || lower.includes('persona')) {
        session.humanTakeover = true;
        session.step = 'HUMAN_SUPPORT';
        await this.sendTyping(targetJid);
        await this.reply(
          targetJid,
          `🧑‍💼 *Atención con Asesor Humano*\n\nHe transferido esta conversación a nuestro equipo de soporte humano. Un asesor te responderá directamente aquí en breve.\n\n_(Si deseas volver al menú interactivo en cualquier momento, escribe *BOT* o *MENU*)_`,
        );
        return;
      }

      // 5. Opción de Registro para clientes nuevos (promociones y descuentos)
      if (lower === '5' || lower.includes('registro') || lower.includes('registrarme') || lower.includes('crear cuenta') || lower.includes('descuento') || lower.includes('promocion') || lower.includes('promoción')) {
        if (customer) {
          await this.sendTyping(targetJid);
          await this.reply(targetJid, `¡Ya estás registrado(a) en el sistema como *${customer.user.nombre}*! Puedes consultar tu catálogo disponible (1) o tus cuentas activas (2).`);
          return;
        }
        const platformName = await this.getPlatformName();
        session.step = 'REGISTER_NAME';
        await this.sendTyping(targetJid);
        await this.reply(
          targetJid,
          `📝 *Registro de Nuevo Cliente ${platformName}*\n\n` +
          `Al registrarte obtendrás:\n` +
          `🎁 Promociones y descuentos preferenciales en tus compras\n` +
          `🛡️ Garantía directa y reemplazos inmediatos\n` +
          `⚡ Historial y acceso a tus pantallas activas\n\n` +
          `Para completar tus datos, por favor escribe tu *Nombre y Apellido completo*:`,
        );
        return;
      }

      // Comprar directamente
      if (lower.startsWith('comprar') || lower.startsWith('pedir') || lower.startsWith('ordenar') || lower.includes('quiero comprar')) {
        await this.startPurchaseFlow(targetJid, cleanText, customer, session, botUser, pushName);
        return;
      }

      // Interceptar preguntas sobre disponibilidad de plataformas o servicios específicos
      const handledInquiry = await this.checkServiceInquiry(targetJid, cleanText, customer, botUser);
      if (handledInquiry) {
        return;
      }

      // Si no fue opción estricta ni servicio conocido, procesar con IA Local
      await this.handleAiQuery(targetJid, text, clientName, customer, botUser);
      return;
    }

    // ==========================================================
    // ESTADO: CATÁLOGO (Si el cliente selecciona un plan o pregunta por disponibilidad)
    // ==========================================================
    if (session.step === 'CATALOG') {
      if (lower.startsWith('comprar') || lower.startsWith('pedir') || lower.match(/^[0-9]+$/)) {
        await this.startPurchaseFlow(targetJid, cleanText, customer, session, botUser, pushName);
        return;
      }

      // Interceptar preguntas sobre disponibilidad de plataformas o servicios específicos
      const handledInquiry = await this.checkServiceInquiry(targetJid, cleanText, customer, botUser);
      if (handledInquiry) {
        return;
      }

      // Consultar IA con contexto de catálogo
      await this.handleAiQuery(targetJid, text, clientName, customer, botUser);
      return;
    }

    // ==========================================================
    // ESTADO: SOPORTE Y CÓDIGOS DE HOGAR
    // ==========================================================
    if (session.step === 'SUPPORT') {
      if (lower.includes('codigo') || lower.includes('código') || lower.includes('hogar') || lower.includes('actualizar')) {
        if (!this.hasModulePermission(botUser, '/admin/sales-accounts')) {
          await this.sendTyping(targetJid);
          await this.reply(targetJid, 'Por políticas de seguridad, la consulta de códigos está asignada a un asesor humano. Escribe *4* para solicitarlo.');
          return;
        }
        await this.sendTyping(targetJid);
        await this.reply(
          targetJid,
          `🔑 *Código Temporal de Hogar:*\n\nSi tu televisor solicita código de hogar en Netflix o Disney, nuestro sistema lo procesa automáticamente. Ingresa a tu Portal de Clientes o responde con el correo de la cuenta para consultar el código más reciente.`,
        );
        return;
      }
    }

    // ==========================================================
    // ESTADO: GARANTÍA
    // ==========================================================
    if (session.step === 'WARRANTY') {
      await this.processWarrantyReport(targetJid, cleanText, customer, clientName, botUser);
      session.step = 'MENU';
      return;
    }

    // Por defecto, consulta libre con IA Local
    const handledInquiry = await this.checkServiceInquiry(targetJid, cleanText, customer, botUser);
    if (handledInquiry) {
      return;
    }
    await this.handleAiQuery(targetJid, text, clientName, customer, botUser);
  }

  // ============================================================
  // 4. MÉTODOS DEL NEGOCIO (CATÁLOGO, CUENTAS DEL CLIENTE, VENTAS)
  // ============================================================

  // MENÚ PRINCIPAL ADAPTATIVO
  private async sendMenu(
    targetJid: string,
    clientName: string,
    botUser: any,
    isRegistered: boolean,
    customer?: any,
  ): Promise<void> {
    await this.sendTyping(targetJid);

    const canCatalog = this.hasModulePermission(botUser, '/admin/catalog');
    const canAccounts = this.hasModulePermission(botUser, '/admin/sales-accounts');
    const canWarranty = this.hasModulePermission(botUser, '/admin/warranty');

    const platformName = await this.getPlatformName();
    const isSystem = await this.isSystemUser(targetJid, customer, undefined, clientName);

    let mensaje = '';
    if (isSystem) {
      mensaje += `¡Hola, *${clientName}*! 👋 Bienvenido a *${platformName}* 🍿\n`;
      mensaje += `💼 *Perfil:* Usuario del Sistema (Administrador / Operativo)\n\n`;
      mensaje += `¿En qué te podemos ayudar hoy? Por favor responde con el *número* de tu opción:\n\n`;
      if (canCatalog) {
        mensaje += `1️⃣ *Ver Catálogo y Precios* (Cuentas con entrega inmediata)\n`;
      }
      mensaje += `4️⃣ *Hablar con un Asesor Humano*\n\n`;
      mensaje += `🔒 _(Nota de Seguridad: Por políticas del sistema, las cuentas y credenciales de usuarios del sistema deben consultarse y gestionarse exclusivamente desde el Panel Web)_`;
      await this.reply(targetJid, mensaje);
      return;
    }

    if (isRegistered && customer?.whatsapp) {
      mensaje += `¡Hola de nuevo, *${clientName}*! 👋 Qué alegría tenerte de regreso en *${platformName}* 🍿\n`;
      mensaje += `📱 *WhatsApp Registrado:* +${customer.whatsapp}\n`;
      mensaje += `⭐ *Estado:* Cliente Registrado en el Sistema\n\n`;
    } else {
      mensaje += `¡Hola *${clientName}*! 👋 Te damos la bienvenida a *${platformName}* 🍿\n`;
      mensaje += `✨ *Estado:* Cliente Nuevo\n\n`;
    }

    mensaje += `¿En qué te podemos ayudar hoy? Por favor responde con el *número* de tu opción:\n\n`;

    if (canCatalog) {
      mensaje += `1️⃣ *Ver Catálogo y Precios* (Cuentas con entrega inmediata)\n`;
    }
    if (canAccounts) {
      mensaje += `2️⃣ *Mis Cuentas Activas y Soporte* (PINs y Contraseñas)\n`;
    }
    if (canWarranty) {
      mensaje += `3️⃣ *Reclamar Garantía* (Reportar caída de cuenta)\n`;
    }
    mensaje += `4️⃣ *Hablar con un Asesor Humano*\n`;

    // Si no está registrado, ofrecer el registro para descuentos
    if (!isRegistered) {
      mensaje += `5️⃣ *Registrarme como Cliente* 🎁 _(Accede a promociones y descuentos)_\n`;
    }

    mensaje += `\n_💡 O escríbeme directamente el servicio que deseas comprar y te atenderé al instante._`;

    await this.reply(targetJid, mensaje);
  }

  // OPCIÓN 1: CATÁLOGO CON CUENTAS DISPONIBLES & PROMESA DE GESTIÓN EN 10 MINUTOS
  private async handleCatalogOption(targetJid: string, botUser: any): Promise<void> {
    await this.sendTyping(targetJid);

    if (!this.hasModulePermission(botUser, '/admin/catalog')) {
      await this.reply(
        targetJid,
        '📋 La visualización de catálogo por asistente virtual no está habilitada en este momento por administración.\n\nPor favor responde *4* para solicitar cotización directamente con un asesor humano.',
      );
      return;
    }

    try {
      const services = await this.prisma.service.findMany({
        where: { activo: true },
        include: {
          plans: {
            where: { activo: true },
            orderBy: { precio: 'asc' },
          },
        },
      });

      if (!services || services.length === 0) {
        await this.reply(targetJid, 'En este momento nuestro catálogo se está actualizando. Escribe *4* para consultar disponibilidad con un asesor.');
        return;
      }

      // Filtrar únicamente los planes que tienen cuentas DISPONIBLES en inventario
      const availableItems: Array<{
        index: number;
        serviceName: string;
        plan: any;
        availableCount: number;
      }> = [];

      let planIndex = 1;
      for (const s of services) {
        for (const p of s.plans) {
          const availableCount = await this.prisma.account.count({
            where: {
              planId: p.id,
              estado: 'DISPONIBLE',
            },
          });

          if (availableCount > 0) {
            availableItems.push({
              index: planIndex++,
              serviceName: s.nombre,
              plan: p,
              availableCount,
            });
          }
        }
      }

      let catalogoTexto = `📋 *CATÁLOGO DE CUENTAS DISPONIBLES* 🎬\n`;
      catalogoTexto += `_Cuentas 100% verificadas con entrega inmediata en inventario:_\n\n`;

      if (availableItems.length > 0) {
        const grouped = new Map<string, typeof availableItems>();
        for (const item of availableItems) {
          if (!grouped.has(item.serviceName)) {
            grouped.set(item.serviceName, []);
          }
          grouped.get(item.serviceName)!.push(item);
        }

        for (const [serviceName, items] of grouped.entries()) {
          catalogoTexto += `📺 *${serviceName.toUpperCase()}*\n`;
          for (const it of items) {
            const precioFormatted = Number(it.plan.precio).toLocaleString('es-CO');
            catalogoTexto += `  *[${it.index}]* *${it.plan.nombrePlan}*: $${precioFormatted} COP / ${it.plan.duracionDias} días\n`;
            catalogoTexto += `      ⚡ _Entrega Inmediata (${it.availableCount} disponibles) - ${it.plan.pantallasSimultaneas} pant._\n`;
          }
          catalogoTexto += `\n`;
        }
      } else {
        catalogoTexto += `⚠️ _En este momento todas nuestras cuentas de entrega instantánea están asignadas._\n\n`;
      }

      catalogoTexto += `⏳ *¿BUSCAS OTRA PLATAFORMA O CUENTA?* (Disney+, Max, Prime Video, Spotify, etc.)\n`;
      catalogoTexto += `Si la cuenta que buscas no está en la lista disponible, ¡pregúntanos por ella y **te la gestionamos y activamos en no más de 10 minutos** garantizado! ⏱️\n\n`;
      catalogoTexto += `💳 *Métodos de pago:* Nequi, Daviplata, Bancolombia.\n\n`;
      catalogoTexto += `🛍️ *¿Cómo ordenar?* Responde *COMPRAR* y el número o nombre del servicio (ej: *"COMPRAR 1"* o *"COMPRAR Disney"*).`;

      await this.reply(targetJid, catalogoTexto);
    } catch (e: any) {
      this.logger.error(`Error consultando catálogo con stock: ${e.message}`);
      await this.reply(targetJid, 'No pudimos cargar el catálogo en este momento. Por favor responde *4* para atenderte personalmente.');
    }
  }

  // OPCIÓN 2: MOSTRAR ÚNICAMENTE LAS CUENTAS DEL CLIENTE CONSULTANTE
  private async handleSupportOption(
    targetJid: string,
    customer: any,
    clientName: string,
    botUser: any,
  ): Promise<void> {
    await this.sendTyping(targetJid);

    if (!this.hasModulePermission(botUser, '/admin/sales-accounts')) {
      await this.reply(
        targetJid,
        '🔐 Por políticas de seguridad, la visualización de credenciales por este chat ha sido restringida.\n\nPuedes consultar tus cuentas en tu Portal de Clientes o responder *4* para atención personalizada.',
      );
      return;
    }

    // BÚSQUEDA EXCLUSIVA EN BASE DE DATOS
    let activeCustomer = customer;
    if (!activeCustomer) {
      activeCustomer = await this.findCustomer(targetJid);
    }

    // DIRECTRIZ CRÍTICA DE SEGURIDAD:
    // EL BOT SOLO PUEDE MOSTRAR INFORMACIÓN DE CLIENTES.
    // NUNCA DEBE MOSTRAR INFORMACIÓN DE USUARIOS DEL SISTEMA (ADMIN, VENDEDOR, SOPORTE, ASESOR),
    // ASÍ ESTOS TENGAN PLANES CONTRATADOS COMO CLIENTES.
    const isSystem = await this.isSystemUser(targetJid, activeCustomer, undefined, clientName);
    if (isSystem) {
      await this.reply(
        targetJid,
        `🔒 *ACCESO RESTRINGIDO - USUARIO DEL SISTEMA*\n\n` +
        `Estimado(a) *${clientName}*, se ha detectado que tu perfil corresponde a un **Usuario del Sistema** (Administrador / Operativo).\n\n` +
        `⚠️ *Directriz de Confidencialidad y Seguridad:* Por estrictas políticas de protección de datos, **el bot tiene prohibido mostrar información de cuentas o suscripciones de usuarios del sistema por WhatsApp**, aun si tienes planes o servicios contratados como cliente.\n\n` +
        `💻 Por favor ingresa directamente con tus credenciales a tu **Panel Web del Sistema** para consultar tus cuentas, servicios y accesos administrativos.`,
      );
      return;
    }

    if (!activeCustomer || !activeCustomer.id) {
      await this.reply(
        targetJid,
        `Estimado(a) *${clientName}*, no encontramos una cuenta de cliente registrada a tu nombre en nuestro sistema.\n\n` +
        `• Si ya realizaste una compra anteriormente con otro número o correo, escribe *4* para que un asesor te asista.\n` +
        `• Para ver nuestro catálogo de cuentas con entrega inmediata, escribe *1*.\n` +
        `• Para registrarte como nuevo cliente, escribe *REGISTRARME*.`,
      );
      return;
    }

    // Consultar exclusivamente las suscripciones activas o en garantía de este customer.id en la BD
    const customerSubscriptions = await this.prisma.subscription.findMany({
      where: {
        customerId: activeCustomer.id,
        estado: { in: ['ACTIVA', 'EN_GARANTIA'] },
      },
      include: {
        plan: {
          include: {
            service: { select: { nombre: true } },
          },
        },
        account: true,
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    if (!customerSubscriptions || customerSubscriptions.length === 0) {
      await this.reply(
        targetJid,
        `Hola *${activeCustomer.user.nombre}*, estás registrado(a) en el sistema con el WhatsApp *+${activeCustomer.whatsapp}*, pero actualmente no registras ninguna suscripción activa.\n\n` +
        `Si deseas adquirir una pantalla o renovar un servicio anterior, escribe *1* para ver nuestro catálogo con entrega inmediata.`,
      );
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const platformName = await this.getPlatformName();
    let cuentasTexto = `🔐 *TUS CUENTAS ACTIVAS - ${platformName.toUpperCase()}*\n`;
    cuentasTexto += `_Cliente: ${activeCustomer.user.nombre} | WhatsApp: +${activeCustomer.whatsapp}_\n\n`;

    customerSubscriptions.forEach((sub: any, index: number) => {
      const fechaVence = new Date(sub.fechaVencimiento);
      const diasRestantes = Math.ceil((fechaVence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      const fechaVenceStr = fechaVence.toLocaleDateString('es-CO');

      cuentasTexto += `*${index + 1}. ${sub.plan?.service?.nombre || 'Servicio'}* - ${sub.plan?.nombrePlan || 'Plan'}\n`;
      if (sub.account) {
        cuentasTexto += `  📧 Email: \`${sub.account.emailCuenta}\`\n`;
        cuentasTexto += `  🔑 Contraseña: \`${sub.account.passwordCuenta}\`\n`;
        if (sub.account.perfilAsignado) {
          cuentasTexto += `  👤 Perfil: *${sub.account.perfilAsignado}*\n`;
        }
        if (sub.account.pinPerfil || sub.account.assignedPin) {
          cuentasTexto += `  🔢 PIN de Perfil: *${sub.account.assignedPin || sub.account.pinPerfil}*\n`;
        }
      }
      cuentasTexto += `  📅 Vence: *${fechaVenceStr}* (${diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Vence hoy'})\n\n`;
    });

    cuentasTexto += `⚠️ *Reglas para mantener tu garantía:* No cambiar correo ni contraseña. Si tu TV solicita código de hogar en Netflix, responde con la palabra *CODIGO*.`;

    await this.reply(targetJid, cuentasTexto);
  }

  // ============================================================
  // 5. REGISTRO AUTOMÁTICO DE CLIENTES Y VENTAS
  // ============================================================

  // REGISTRAR CLIENTE EN PRISMA (User + Customer)
  private async registerNewCustomer(
    targetJid: string,
    fullName: string,
    email?: string | null,
  ): Promise<any> {
    const resolvedPhone = await this.resolvePhoneFromJid(targetJid);
    const cleanPhone = resolvedPhone || (targetJid.includes('@s.whatsapp.net')
      ? targetJid.split('@')[0].split(':')[0].replace(/\D/g, '')
      : '');

    // 1. CLAVE PRINCIPAL: Buscar si el cliente ya existe por número de teléfono / WhatsApp
    let existingCustomer = await this.findCustomer(targetJid);
    if (existingCustomer) {
      this.logger.log(`Cliente ya existe por WhatsApp (${existingCustomer.whatsapp}): ${existingCustomer.user?.nombre}`);
      return existingCustomer;
    }

    if (cleanPhone && cleanPhone.length >= 7) {
      const customerByPhone = await this.prisma.customer.findFirst({
        where: {
          user: { rol: UserRole.CLIENTE },
          OR: [
            { whatsapp: cleanPhone },
            { whatsapp: `+${cleanPhone}` },
            { user: { phone: cleanPhone } },
            { user: { phone: `+${cleanPhone}` } },
          ],
        },
        include: { user: true },
      });
      if (customerByPhone) {
        return customerByPhone;
      }
    }

    // 2. Si proporcionó correo, verificar si ya existe en tabla User
    const normalizedEmail = email && email.trim().length > 0 ? email.trim().toLowerCase() : null;
    if (normalizedEmail) {
      let existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { customer: true },
      });

      if (existingUser) {
        if (existingUser.rol !== UserRole.CLIENTE) {
          this.logger.warn(`El usuario ${existingUser.email} es un usuario del sistema (${existingUser.rol}) y no puede operar como cliente.`);
          return null;
        }

        if (existingUser.customer) {
          return {
            ...existingUser.customer,
            user: existingUser,
          };
        }

        const createdCustomer = await this.prisma.customer.create({
          data: {
            userId: existingUser.id,
            whatsapp: cleanPhone || existingUser.phone || '573000000000',
            pais: 'Colombia',
          },
          include: { user: true },
        });
        return createdCustomer;
      }
    }

    // 3. Crear nuevo Usuario y Cliente (WhatsApp como Clave Principal, Email opcional)
    const finalPhone = cleanPhone && cleanPhone.length >= 7 ? cleanPhone : '573000000000';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Cliente_MezaStreaming_2025!', salt);

    const newUser = await this.prisma.user.create({
      data: {
        nombre: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: finalPhone,
        rol: UserRole.CLIENTE,
        activo: true,
        modulosPermitidos: [],
        customer: {
          create: {
            whatsapp: finalPhone,
            pais: 'Colombia',
          },
        },
      },
      include: { customer: true },
    });

    if (targetJid.includes('@lid')) {
      const lidDigits = targetJid.split('@')[0].split(':')[0].replace(/\D/g, '');
      this.lidCache.set(lidDigits, finalPhone);
    }

    return {
      ...newUser.customer,
      user: newUser,
    };
  }

  // CONSULTA INTELIGENTE DE SERVICIOS Y DISPONIBILIDAD INMEDIATA VS 10 MINUTOS
  private async checkServiceInquiry(
    targetJid: string,
    text: string,
    customer: any,
    botUser: any,
  ): Promise<boolean> {
    const lower = text.toLowerCase();

    // Palabras reservadas que no deben considerarse consultas de producto
    if (['1', '2', '3', '4', '5', 'menu', 'hola', 'buenas', 'soporte', 'garantia', 'garantía', 'asesor', 'bot', 'reset'].includes(lower)) {
      return false;
    }

    try {
      const services = await this.prisma.service.findMany({
        where: { activo: true },
        include: {
          plans: {
            where: { activo: true },
            orderBy: { precio: 'asc' },
          },
        },
      });

      // Encontrar si el texto menciona alguno de nuestros servicios
      const matchedService = services.find((s) => {
        const sName = s.nombre.toLowerCase();
        const parts = sName.split(/[\s+()_-]+/);
        return parts.some((p) => p.length >= 3 && lower.includes(p));
      });

      if (!matchedService || matchedService.plans.length === 0) {
        return false;
      }

      await this.sendTyping(targetJid);

      // Calcular stock de cada plan de este servicio
      let totalStock = 0;
      const plansWithStock: Array<{ plan: any; stock: number }> = [];

      for (const p of matchedService.plans) {
        const count = await this.prisma.account.count({
          where: { planId: p.id, estado: 'DISPONIBLE' },
        });
        plansWithStock.push({ plan: p, stock: count });
        totalStock += count;
      }

      if (totalStock > 0) {
        let msg = `✅ *¡Sí tenemos cuentas disponibles de ${matchedService.nombre}!* ⚡\n`;
        msg += `_Entrega inmediata garantizada en inventario_\n\n`;
        for (const item of plansWithStock) {
          if (item.stock > 0) {
            const precioFormatted = Number(item.plan.precio).toLocaleString('es-CO');
            msg += `• *${item.plan.nombrePlan}*: $${precioFormatted} COP / ${item.plan.duracionDias} días (${item.stock} disponibles)\n`;
          }
        }
        msg += `\n🛍️ Para comprarla de inmediato, responde: *COMPRAR ${matchedService.nombre}*`;
        await this.reply(targetJid, msg);
        return true;
      } else {
        // SIN STOCK INMEDIATO: Garantía estricta de 10 minutos
        let msg = `⏳ Actualmente las cuentas de *${matchedService.nombre}* no cuentan con entrega inmediata en inventario.\n\n`;
        msg += `¡Pero **te la gestionamos y activamos en no más de 10 minutos** garantizado! ⏱️\n\n`;
        msg += `📺 *Planes oficiales:*\n`;
        for (const item of plansWithStock) {
          const precioFormatted = Number(item.plan.precio).toLocaleString('es-CO');
          msg += `• *${item.plan.nombrePlan}*: $${precioFormatted} COP / ${item.plan.duracionDias} días (${item.plan.pantallasSimultaneas} pant.)\n`;
        }
        msg += `\n🛍️ ¿Deseas que te la gestionemos ahora? Responde con la palabra *COMPRAR ${matchedService.nombre}* para iniciar tu pedido.`;
        await this.reply(targetJid, msg);
        return true;
      }
    } catch (e: any) {
      this.logger.error(`Error verificando consulta de servicio: ${e.message}`);
      return false;
    }
  }

  // INICIAR FLUJO DE COMPRA Y VENTA
  private async startPurchaseFlow(
    targetJid: string,
    text: string,
    customer: any,
    session: UserSession,
    botUser: any,
    pushName: string,
  ): Promise<void> {
    await this.sendTyping(targetJid);

    if (!this.hasModulePermission(botUser, '/admin/orders')) {
      await this.reply(
        targetJid,
        '🛍️ El registro directo de ventas y órdenes por bot está pausado temporalmente por administración.\n\nPor favor responde *4* para comunicarte con un asesor comercial.',
      );
      return;
    }

    const services = await this.prisma.service.findMany({
      where: { activo: true },
      include: { plans: { where: { activo: true }, orderBy: { precio: 'asc' } } },
    });

    const availablePlans: Array<{ index: number; plan: any; serviceName: string; stock: number }> = [];
    const allPlans: Array<{ index: number; plan: any; serviceName: string; stock: number }> = [];

    let availIdx = 1;
    let allIdx = 1;

    for (const s of services) {
      for (const p of s.plans) {
        const count = await this.prisma.account.count({
          where: { planId: p.id, estado: 'DISPONIBLE' },
        });
        if (count > 0) {
          availablePlans.push({ index: availIdx++, plan: p, serviceName: s.nombre, stock: count });
        }
        allPlans.push({ index: allIdx++, plan: p, serviceName: s.nombre, stock: count });
      }
    }

    let selectedItem: any = null;
    const matchNumber = text.match(/\b\d+\b/);

    if (matchNumber) {
      const selectedIdx = parseInt(matchNumber[0], 10);
      // Primero verificar si coincide con el catálogo de disponibles
      selectedItem = availablePlans.find((item) => item.index === selectedIdx);
      if (!selectedItem) {
        selectedItem = allPlans.find((item) => item.index === selectedIdx);
      }
    }

    if (!selectedItem) {
      const lowerText = text.toLowerCase();
      // Buscar por nombre de servicio o plan
      selectedItem = allPlans.find((item) => {
        const sName = item.serviceName.toLowerCase();
        const pName = item.plan.nombrePlan.toLowerCase();
        return lowerText.includes(sName) || lowerText.includes(pName);
      });
    }

    if (!selectedItem) {
      await this.reply(
        targetJid,
        `Para registrar tu compra, por favor indica el número o nombre del servicio que deseas adquirir (ej: *"COMPRAR 1"* o *"COMPRAR Disney"*).\n\n` +
        `_(O escribe *1* para consultar el catálogo de cuentas disponibles)_`,
      );
      return;
    }

    session.selectedPlanId = selectedItem.plan.id;
    session.selectedPlanName = `${selectedItem.serviceName} - ${selectedItem.plan.nombrePlan}`;
    session.selectedPlanPrice = Number(selectedItem.plan.precio);
    session.selectedPlanStock = selectedItem.stock;

    let stockMessage = '';
    if (selectedItem.stock > 0) {
      stockMessage = `⚡ *Stock Disponible:* ¡Entrega inmediata garantizada (${selectedItem.stock} en inventario)!`;
    } else {
      stockMessage = `⏳ *Gestión bajo Pedido:* En este momento no hay entrega instantánea, pero **te la gestionamos y activamos en no más de 10 minutos** tras confirmar tu pago. ⏱️`;
    }

    // Comprobar si es CLIENTE EXISTENTE (ya registrado en el sistema por su WhatsApp/teléfono)
    let currentCustomer = customer;
    if (!currentCustomer) {
      currentCustomer = await this.findCustomer(targetJid);
    }

    const platformName = await this.getPlatformName();

    if (currentCustomer) {
      // Cliente existente: NO SOLICITA DATOS DE CREACIÓN DE CUENTA
      // Solo método de pago, formalizando la venta directamente y evitando duplicidad
      session.customerId = currentCustomer.id;
      session.step = 'BUY_PAY_METHOD';
      await this.reply(
        targetJid,
        `🛒 *Confirmación de Venta - ${platformName}*\n` +
        `¡Hola de nuevo, *${currentCustomer.user.nombre}*! 👋\n\n` +
        `📱 *WhatsApp Registrado:* +${currentCustomer.whatsapp}\n` +
        `• *Servicio:* ${session.selectedPlanName}\n` +
        `• *Total a Pagar:* $${session.selectedPlanPrice?.toLocaleString('es-CO')} COP\n` +
        `${stockMessage}\n\n` +
        `✅ *Cliente Registrado:* Como tu número ya está registrado en nuestro sistema, tu orden se asociará directamente a tu cuenta sin solicitarte datos adicionales (evitando duplicidad).\n\n` +
        `Por favor selecciona tu *método de pago* para generar tu orden:`,
      );
      await this.sendPaymentOptions(targetJid, currentCustomer, session, botUser);
      return;
    }

    // Cliente nuevo: proceso de registro y venta
    session.step = 'BUY_REGISTER_NAME';
    await this.reply(
      targetJid,
      `🛒 *Registro y Venta - ${platformName}*\n\n` +
      `• *Servicio:* ${session.selectedPlanName}\n` +
      `• *Total a Pagar:* $${session.selectedPlanPrice?.toLocaleString('es-CO')} COP\n` +
      `${stockMessage}\n\n` +
      `👋 *¡Bienvenido!* Notamos que aún no te encuentras registrado en nuestro sistema.\n\n` +
      `Para crear tu cuenta de cliente oficial, asociar tu garantía y darte acceso a promociones y descuentos, por favor escribe tu *Nombre y Apellido completo*:`,
    );
  }

  // ENVIAR OPCIONES DE PAGO Y MEDIOS CONFIGURADOS
  private async sendPaymentOptions(
    targetJid: string,
    customer: any,
    session: UserSession,
    botUser: any,
  ): Promise<void> {
    await this.sendTyping(targetJid);

    const settings = await this.prisma.systemSetting.findUnique({
      where: { id: 'singleton' },
    });

    const mediosPago: any[] = Array.isArray(settings?.mediosPago)
      ? (settings.mediosPago as any[]).filter((m: any) => m.activo !== false)
      : [];

    let msg = `🛒 *Confirmación de Pedido*\n`;
    msg += `• *Cliente:* ${customer.user.nombre}\n`;
    msg += `• *Plan:* ${session.selectedPlanName}\n`;
    msg += `• *Total a Pagar:* $${session.selectedPlanPrice?.toLocaleString('es-CO')} COP\n\n`;
    msg += `💳 *Cuentas Oficiales para Transferir:*\n\n`;

    if (mediosPago.length > 0) {
      mediosPago.forEach((m) => {
        msg += `🔹 *${m.banco.toUpperCase()}* (${m.tipoCuenta || 'Billetera'})\n`;
        msg += `   Número: \`${m.numeroCuenta}\`\n`;
        msg += `   Titular: ${m.titular}\n`;
        if (m.instrucciones) msg += `   _${m.instrucciones}_\n`;
        msg += `\n`;
      });
    } else {
      msg += `🔹 *Nequi / Daviplata:* \`3216055426\` (Jorge Meza)\n\n`;
    }

    msg += `Por favor responde con el nombre del método que usaste (ej: *"Nequi"*, *"Daviplata"* o *"Bancolombia"*) para radicar tu orden formalmente.`;

    await this.reply(targetJid, msg);
  }

  // PROCESAR REGISTRO DE LA ORDEN EN EL SISTEMA
  private async processOrderRegistration(
    targetJid: string,
    metodoPagoTexto: string,
    customer: any,
    session: UserSession,
    botUser: any,
  ): Promise<void> {
    await this.sendTyping(targetJid);

    if (!this.hasModulePermission(botUser, '/admin/orders')) {
      await this.reply(
        targetJid,
        '🛍️ El registro de ventas directas por asistente virtual se encuentra pausado por administración. Por favor responde *4* para atenderte con un asesor comercial.',
      );
      session.step = 'MENU';
      return;
    }

    try {
      let finalCustomer = customer;
      if (!finalCustomer && session.customerId) {
        finalCustomer = await this.prisma.customer.findUnique({
          where: { id: session.customerId },
          include: { user: true },
        });
      }
      if (!finalCustomer) {
        finalCustomer = await this.findCustomer(targetJid);
      }

      if (!finalCustomer || !session.selectedPlanId) {
        await this.reply(targetJid, 'No pudimos asociar los datos del cliente para completar la orden. Escribe *MENU* para reiniciar tu solicitud.');
        session.step = 'MENU';
        return;
      }

      const plan = await this.prisma.plan.findUnique({
        where: { id: session.selectedPlanId },
        include: { service: true },
      });

      if (!plan) {
        await this.reply(targetJid, 'El plan seleccionado no está disponible. Escribe *1* para ver el catálogo.');
        session.step = 'MENU';
        return;
      }

      // Crear la Orden oficial en Prisma asignada al usuario del Bot
      const order = await this.prisma.order.create({
        data: {
          customerId: finalCustomer.id,
          total: plan.precio,
          estado: 'PENDIENTE',
          metodoPago: metodoPagoTexto.toUpperCase().trim(),
          vendedorId: botUser.id,
          vendedorNombre: botUser.nombre,
          descripcionVenta: `[Venta WhatsApp Bot - ${botUser.nombre}] ${plan.service.nombre} - ${plan.nombrePlan}`,
          items: {
            create: {
              planId: plan.id,
              cantidad: 1,
              precioUnitario: plan.precio,
              subtotal: plan.precio,
            },
          },
        },
      });

      const orderRef = order.id.slice(0, 8).toUpperCase();

      let confirmacion = `✅ *¡ORDEN REGISTRADA EXITOSAMENTE!*\n\n`;
      confirmacion += `• *Número de Pedido:* #${orderRef}\n`;
      confirmacion += `• *Cliente:* ${finalCustomer.user.nombre}\n`;
      confirmacion += `• *Atendido por:* ${botUser.nombre}\n`;
      confirmacion += `• *Servicio:* ${plan.service.nombre} (${plan.nombrePlan})\n`;
      confirmacion += `• *Total:* $${Number(plan.precio).toLocaleString('es-CO')} COP\n`;
      confirmacion += `• *Método Seleccionado:* ${metodoPagoTexto.toUpperCase()}\n\n`;
      confirmacion += `📸 *PASO FINAL:* Envía una foto o captura del comprobante de pago por este mismo chat.\n\n`;

      if (session.selectedPlanStock && session.selectedPlanStock > 0) {
        confirmacion += `⚡ *Entrega Inmediata:* Tan pronto verifiquemos tu comprobante, tus credenciales serán enviadas de inmediato por este chat.`;
      } else {
        confirmacion += `⏳ *Compromiso de Entrega:* Tu cuenta no contaba con entrega inmediata, pero **te la gestionaremos y activamos en no más de 10 minutos** tras verificar tu comprobante. 🚀`;
      }

      session.pendingOrderId = order.id;
      session.step = 'AWAITING_PAYMENT_RECEIPT';
      session.selectedPlanId = undefined;
      session.selectedPlanName = undefined;
      session.selectedPlanPrice = undefined;
      session.selectedPlanStock = undefined;

      await this.reply(targetJid, confirmacion);
    } catch (e: any) {
      this.logger.error(`Error registrando orden de venta por bot: ${e.message}`);
      await this.reply(targetJid, 'Hubo un inconveniente al generar tu orden. Por favor responde *4* para atenderte personalmente.');
    }
  }

  // ============================================================
  // ADJUNTAR COMPROBANTE DE PAGO ENVIADO POR EL CLIENTE
  // ============================================================
  private async handleImageAttachment(
    session: UserSession,
    customer: any,
    clientName: string,
    botUser: any,
    targetJid: string,
    pushName: string,
    messageData: any,
    captionText?: string,
  ): Promise<void> {
    await this.sendTyping(targetJid);

    try {
      // 1. Extraer la imagen en Base64 / Data URI
      const receiptImage = await this.extractImageFromMessage(messageData);

      if (!receiptImage) {
        this.logger.warn(`No se pudo extraer la imagen del mensaje recibido de ${targetJid}`);
        await this.reply(
          targetJid,
          `⚠️ Recibimos una imagen pero no pudimos procesar el archivo. Por favor reenvía la foto o captura directamente, o responde *4* para que un asesor te asista.`,
        );
        return;
      }

      // 2. Buscar la orden asociada:
      // Prioridad 1: session.pendingOrderId
      // Prioridad 2: La orden PENDIENTE más reciente del cliente
      let targetOrder: any = null;

      if (session.pendingOrderId) {
        targetOrder = await this.prisma.order.findUnique({
          where: { id: session.pendingOrderId },
          include: {
            customer: { include: { user: true } },
            items: { include: { plan: { include: { service: true } } } },
          },
        });
      }

      if (!targetOrder) {
        const cleanPhone = targetJid.includes('@s.whatsapp.net')
          ? targetJid.split('@')[0].replace(/\D/g, '')
          : targetJid.replace(/\D/g, '');

        const phoneConditions = [];
        if (customer?.id) {
          phoneConditions.push({ customerId: customer.id });
        }
        if (cleanPhone.length >= 7) {
          phoneConditions.push({ customer: { user: { phone: { contains: cleanPhone.slice(-8) } } } });
          phoneConditions.push({ customer: { user: { phone: cleanPhone } } });
        }

        if (phoneConditions.length > 0) {
          targetOrder = await this.prisma.order.findFirst({
            where: {
              estado: 'PENDIENTE',
              comprobanteVerificado: false,
              OR: phoneConditions,
            },
            orderBy: { createdAt: 'desc' },
            include: {
              customer: { include: { user: true } },
              items: { include: { plan: { include: { service: true } } } },
            },
          });
        }
      }

      // 3. Si encontramos la orden pendiente, le adjuntamos el comprobante como soporte de pago
      if (targetOrder) {
        await this.prisma.order.update({
          where: { id: targetOrder.id },
          data: {
            comprobanteUrl: receiptImage,
            comprobanteVerificado: false,
          },
        });

        // Actualizar sesión del bot
        session.pendingOrderId = undefined;
        session.step = 'MENU';

        const platformName = await this.getPlatformName();
        const orderRef = targetOrder.id.slice(0, 8).toUpperCase();
        const planItem = targetOrder.items?.[0]?.plan;
        const serviceName = planItem?.service?.nombre
          ? `${planItem.service.nombre} (${planItem.nombrePlan})`
          : 'Servicio Contratado';
        const totalFormatted = Number(targetOrder.total).toLocaleString('es-CO');

        let confirmacion = `✅ *¡COMPROBANTE DE PAGO RECIBIDO EXITOSAMENTE!* 📸\n\n`;
        confirmacion += `Hemos registrado y adjuntado tu soporte de pago a tu orden *#${orderRef}*.\n\n`;
        confirmacion += `• *Cliente:* ${targetOrder.customer?.user?.nombre || clientName}\n`;
        confirmacion += `• *Servicio:* ${serviceName}\n`;
        confirmacion += `• *Total:* $${totalFormatted} COP\n`;
        confirmacion += `• *Estado:* Soporte registrado - En validación\n\n`;
        confirmacion += `⚡ *Próximo Paso:* Nuestro equipo verificará tu transferencia y te despacharemos los accesos correspondientes por este mismo chat en breve.\n\n`;
        confirmacion += `¡Muchas gracias por tu compra en *${platformName}*! Si deseas realizar otra consulta o comprar otro servicio, escribe *Menú*.`;

        await this.reply(targetJid, confirmacion);
        this.logger.log(`Comprobante adjuntado exitosamente a la orden #${orderRef} por ${targetJid}`);
        return;
      }

      // 4. Si el cliente envió una foto pero no tiene ninguna orden pendiente
      let noOrderMsg = `📸 Hemos recibido tu imagen.\n\n`;
      noOrderMsg += `En este momento no registras ninguna orden pendiente de pago por validar.\n\n`;
      noOrderMsg += `• Si deseas reportar una falla técnica o reclamar garantía con esta captura, responde *3*.\n`;
      noOrderMsg += `• Si deseas ver nuestro catálogo y comprar una cuenta, responde *1*.\n`;
      noOrderMsg += `• Si prefieres que un asesor humano revise tu mensaje, responde *4*.\n`;
      noOrderMsg += `• Para ver el menú principal, escribe *Menú*.`;

      await this.reply(targetJid, noOrderMsg);
    } catch (err: any) {
      this.logger.error(`Error procesando adjunto de comprobante: ${err.message}`, err.stack);
      await this.reply(
        targetJid,
        'Ocurrió un inconveniente al asociar tu comprobante. Por favor reenvíalo o escribe *4* para atenderte con un asesor.',
      );
    }
  }

  // EXTRAER BASE64 O URL DE IMAGEN DESDE MENSAJE DE WHATSAPP
  private async extractImageFromMessage(messageData: any): Promise<string | null> {
    try {
      if (!messageData) return null;

      // 1. Comprobar si Evolution API ya entregó el base64 directo
      const directBase64 =
        messageData.base64 ||
        messageData.message?.imageMessage?.base64 ||
        messageData.message?.documentMessage?.base64;

      if (typeof directBase64 === 'string' && directBase64.length > 50) {
        if (directBase64.startsWith('data:image/')) return directBase64;
        const mime = messageData.message?.imageMessage?.mimetype || 'image/jpeg';
        return `data:${mime};base64,${directBase64}`;
      }

      // 2. Intentar descargar / desencriptar media mediante Evolution API
      const mediaResult = await this.whatsappService.getBase64FromMedia(messageData);
      if (mediaResult?.base64 && typeof mediaResult.base64 === 'string' && mediaResult.base64.length > 50) {
        if (mediaResult.base64.startsWith('data:image/')) {
          return mediaResult.base64;
        }
        return `data:${mediaResult.mimetype || 'image/jpeg'};base64,${mediaResult.base64}`;
      }

      // 3. Fallback a miniatura (jpegThumbnail) si estuviera disponible
      const thumbnail =
        messageData.message?.imageMessage?.jpegThumbnail ||
        messageData.message?.documentMessage?.jpegThumbnail;

      if (typeof thumbnail === 'string' && thumbnail.length > 50) {
        if (thumbnail.startsWith('data:image/')) return thumbnail;
        return `data:image/jpeg;base64,${thumbnail}`;
      }

      // 4. Fallback a URL directa si existiera
      const directUrl =
        messageData.message?.imageMessage?.url ||
        messageData.message?.documentMessage?.url;

      if (typeof directUrl === 'string' && directUrl.startsWith('http')) {
        return directUrl;
      }

      return null;
    } catch (err: any) {
      this.logger.error(`Error extrayendo base64 de imagen: ${err.message}`);
      return null;
    }
  }

  // OPCIÓN 3: RECLAMAR GARANTÍA
  private async handleWarrantyOption(
    targetJid: string,
    customer: any,
    clientName: string,
    botUser: any,
  ): Promise<void> {
    await this.sendTyping(targetJid);

    if (!this.hasModulePermission(botUser, '/admin/warranty')) {
      await this.reply(
        targetJid,
        '🛡️ El módulo de radicación de garantías por asistente virtual está desactivado por administración.\n\nPor favor describe tu falla o responde *4* para que el departamento de garantías te asista.',
      );
      return;
    }

    if (!customer || !customer.id) {
      await this.reply(
        targetJid,
        `No encontramos compras registradas con este número de WhatsApp para radicar garantías directas.\n\n` +
        `Por favor escribe con detalle qué cuenta te está fallando o responde *4* para hablar con un asesor.`,
      );
      return;
    }

    const activeSubs = await this.prisma.subscription.findMany({
      where: { customerId: customer.id, estado: 'ACTIVA' },
      include: { plan: { include: { service: true } } },
    });

    if (activeSubs.length === 0) {
      await this.reply(
        targetJid,
        `No tienes suscripciones activas en este momento para reclamar garantía.\n\n` +
        `Si compraste recientemente, responde *4* para que verifiquemos tu comprobante.`,
      );
      return;
    }

    const platformName = await this.getPlatformName();
    let msg = `🛡️ *CENTRO DE GARANTÍAS ${platformName.toUpperCase()}*\n\n`;
    msg += `Cuentas disponibles para garantía:\n`;
    activeSubs.forEach((sub: any, i: number) => {
      msg += `*[${i + 1}]* ${sub.plan?.service?.nombre || 'Plataforma'} - ${sub.plan?.nombrePlan || ''}\n`;
    });
    msg += `\nPor favor indícanos el *número de la cuenta* y describe brevemente el problema (ej: *"La 1 clave incorrecta"*).`;

    await this.reply(targetJid, msg);
  }

  // PROCESAR REPORTE DE GARANTÍA
  private async processWarrantyReport(
    targetJid: string,
    motivo: string,
    customer: any,
    clientName: string,
    botUser: any,
  ): Promise<void> {
    await this.sendTyping(targetJid);

    if (!this.hasModulePermission(botUser, '/admin/warranty')) {
      await this.reply(
        targetJid,
        'Hemos tomado nota de tu mensaje. Un asesor humano del departamento de soporte se comunicará contigo en breve.',
      );
      return;
    }

    try {
      const activeSub = await this.prisma.subscription.findFirst({
        where: { customerId: customer?.id, estado: 'ACTIVA' },
        include: { plan: { include: { service: true } } },
      });

      if (activeSub && customer?.id) {
        const ticket = await this.prisma.supportTicket.create({
          data: {
            customerId: customer.id,
            subscriptionId: activeSub.id,
            motivoReporte: `[Vía ${botUser.nombre}] ${motivo}`,
            estado: 'pendiente_revision',
          },
        });

        await this.reply(
          targetJid,
          `✅ *Garantía radicada con éxito*\n\n` +
          `• *Ticket:* #${ticket.id.slice(0, 8).toUpperCase()}\n` +
          `• *Atendido por:* ${botUser.nombre}\n` +
          `• *Servicio:* ${activeSub.plan?.service?.nombre || 'Streaming'}\n` +
          `• *Reporte:* "${motivo}"\n\n` +
          `Nuestro equipo técnico revisará las credenciales y te enviaremos el reemplazo o solución a este mismo chat en breve.`,
        );
      } else {
        await this.reply(
          targetJid,
          `✅ Hemos tomado nota de tu reporte de garantía: "${motivo}". Un asesor técnico revisará el caso y te responderá en breve.`,
        );
      }
    } catch (e: any) {
      this.logger.error(`Error radicando ticket de soporte: ${e.message}`);
      await this.reply(
        targetJid,
        `Hemos recibido tu reporte de garantía. En unos momentos nuestro equipo técnico se pondrá en contacto contigo.`,
      );
    }
  }

  // ============================================================
  // 6. MOTOR DE IA LOCAL (OLLAMA)
  // ============================================================
  private async handleAiQuery(
    targetJid: string,
    userQuery: string,
    clientName: string,
    customer: any,
    botUser: any,
  ): Promise<void> {
    await this.sendTyping(targetJid);

    const botConfig = await this.whatsappService.getChatbotConfig().catch(() => null) || {};
    const ollamaUrl = botConfig.ollamaUrl || this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434');
    const ollamaModel = botConfig.ollamaModel || this.configService.get<string>('OLLAMA_MODEL', 'qwen2.5:7b');

    const canCatalog = this.hasModulePermission(botUser, '/admin/catalog') && botConfig.moduloCatalogoActivo !== false;
    const canWarranty = this.hasModulePermission(botUser, '/admin/warranty') && botConfig.moduloGarantiaActivo !== false;
    const canAccounts = this.hasModulePermission(botUser, '/admin/sales-accounts') && botConfig.moduloCuentasActivo !== false;
    const canOrders = this.hasModulePermission(botUser, '/admin/orders') && botConfig.moduloVentasActivo !== false;

    const isSystem = await this.isSystemUser(targetJid, customer, undefined, clientName);
    if (isSystem) {
      const lowerQuery = userQuery.toLowerCase();
      if (
        lowerQuery.includes('cuenta') ||
        lowerQuery.includes('pantalla') ||
        lowerQuery.includes('clave') ||
        lowerQuery.includes('pin') ||
        lowerQuery.includes('suscrip') ||
        lowerQuery.includes('servicio') ||
        lowerQuery.includes('acceso') ||
        lowerQuery.includes('mis datos')
      ) {
        await this.reply(
          targetJid,
          `🔒 *ACCESO RESTRINGIDO - USUARIO DEL SISTEMA*\n\n` +
          `Hola *${clientName}*. Por estrictas directrices de confidencialidad y seguridad, **el bot no entrega información de cuentas, suscripciones ni accesos a usuarios del sistema por WhatsApp**.\n\n` +
          `💻 Por favor ingresa directamente a tu **Panel Web del Sistema** para consultar y gestionar tus cuentas asignadas.`,
        );
        return;
      }
    }

    try {
      let catalogSummary = '';
      if (canCatalog) {
        const services = await this.prisma.service.findMany({
          where: { activo: true },
          include: {
            plans: {
              where: { activo: true },
              include: { accounts: { where: { estado: 'DISPONIBLE' } } },
            },
          },
          take: 10,
        });

        catalogSummary = services
          .map((s) => {
            const plans = s.plans
              .map((p) => {
                const stock = p.accounts.length;
                const stockLabel = stock > 0 ? `Stock: ${stock} disponible(s) inmediata` : 'SIN STOCK INMEDIATO (Se gestiona en máx 10 minutos)';
                return `${p.nombrePlan} ($${Number(p.precio).toLocaleString('es-CO')} COP - ${stockLabel})`;
              })
              .join(', ');
            return `${s.nombre}: [${plans}]`;
          })
          .join('; ');
      }

      let faqsContext = '';
      if (Array.isArray(botConfig.faqs) && botConfig.faqs.length > 0) {
        const activeFaqs = botConfig.faqs.filter((f: any) => f.activo !== false);
        if (activeFaqs.length > 0) {
          faqsContext = '\nBASE DE CONOCIMIENTOS ENTRENADA (FAQ):\n' +
            activeFaqs.map((f: any) => `Pregunta: ${f.pregunta}\nRespuesta oficial: ${f.respuesta}`).join('\n\n') + '\n';
        }
      }

      let extraContext = '';
      if (botConfig.contextoAdicional && botConfig.contextoAdicional.trim().length > 0) {
        extraContext = `\nINFORMACIÓN ADICIONAL DE LA EMPRESA:\n${botConfig.contextoAdicional.trim()}\n`;
      }

      let permissionRules = `\nREGLAS DE NEGOCIO Y PRIVILEGIOS (${botConfig.nombreBot || botUser.nombre} - Rol: ${botUser.rol}):\n`;
      permissionRules += `- Catálogo y Precios: ${canCatalog ? 'PERMITIDO' : 'DENEGADO (No des precios)'}.\n`;
      if (botConfig.reglaStock10Min !== false) {
        permissionRules += `- Solo ofrece cuentas con entrega inmediata si tienen stock. Si el cliente pregunta por una cuenta que NO tiene stock disponible (o no está disponible de inmediato): indícale con seguridad y amabilidad que se la gestionamos y activamos en NO MÁS DE 10 MINUTOS garantizado tras su compra.\n`;
      }
      if (botConfig.reglaRegistroPromociones !== false) {
        permissionRules += `- Si el cliente NO está registrado: invítale a registrarse para acceder a promociones, descuentos preferenciales y garantía en sus compras.\n`;
      }
      if (botConfig.reglaVentasSimplificada !== false) {
        permissionRules += `- Ventas: Si es cliente antiguo, se busca en el sistema y solo se pide el método de pago; si es nuevo, se le hace el proceso de registro (nombre y correo) y venta.\n`;
      }
      permissionRules += `- Para comprar: indícale que escriba "COMPRAR" o el número/nombre del servicio.\n`;

      let customPromptsContext = '';
      if (Array.isArray(botConfig.promptsPersonalizados) && botConfig.promptsPersonalizados.length > 0) {
        const activePrompts = botConfig.promptsPersonalizados.filter((p: any) => p.activo !== false);
        if (activePrompts.length > 0) {
          customPromptsContext = '\nREGLAS Y PROMPTS PERSONALIZADOS DE LA EMPRESA:\n' +
            activePrompts.map((p: any, idx: number) => `[REGLA ${idx + 1}: ${p.titulo.toUpperCase()}]\n${p.contenido}`).join('\n\n') + '\n';
        }
      }

      const customInstructions = botConfig.systemPromptPersonalizado && botConfig.systemPromptPersonalizado.trim().length > 0
        ? `\nDIRECTRICES PERSONALIZADAS:\n${botConfig.systemPromptPersonalizado.trim()}\n`
        : '';

      let customerSubscriptionsContext = '';
      if (!isSystem && customer && customer.id) {
        const subs = await this.prisma.subscription.findMany({
          where: {
            customerId: customer.id,
            estado: { in: ['ACTIVA', 'EN_GARANTIA'] },
          },
          include: {
            plan: { include: { service: { select: { nombre: true } } } },
            account: true,
          },
          orderBy: { fechaVencimiento: 'asc' },
        });

        if (subs && subs.length > 0) {
          customerSubscriptionsContext = `\nSUSCRIPCIONES ACTIVAS DEL CLIENTE EN LA BASE DE DATOS (VERÍDICO - PUEDES RESPONDER AL CLIENTE SOBRE ESTAS CUENTAS):\n` +
            subs.map((s: any, idx: number) => {
              const svc = s.plan?.service?.nombre || 'Servicio';
              const pln = s.plan?.nombrePlan || 'Plan';
              const exp = new Date(s.fechaVencimiento).toLocaleDateString('es-CO');
              let accInfo = `Email: ${s.account?.emailCuenta || 'N/A'}, Clave: ${s.account?.passwordCuenta || 'N/A'}`;
              if (s.account?.perfilAsignado) accInfo += `, Perfil: ${s.account.perfilAsignado}`;
              if (s.account?.pinPerfil || s.account?.assignedPin) accInfo += `, PIN: ${s.account.assignedPin || s.account.pinPerfil}`;
              return `[${idx + 1}] ${svc} (${pln}) - Estado: ${s.estado} - Vence: ${exp} | Datos de Acceso: ${accInfo}`;
            }).join('\n') + '\n';
        } else {
          customerSubscriptionsContext = `\nSUSCRIPCIONES DEL CLIENTE: El cliente está registrado en el sistema pero NO tiene suscripciones activas actualmente.\n`;
        }
      }

      const platformName = await this.getPlatformName();
      const systemPrompt = 
        `Eres ${botConfig.nombreBot || botUser.nombre}, el asesor y asistente virtual oficial de ${platformName} en WhatsApp.\n` +
        `Estás hablando con: ${clientName} (${isSystem ? 'USUARIO DEL SISTEMA - ADMIN/OPERATIVO' : (customer ? 'Cliente Registrado en el sistema' : 'Cliente Nuevo / No Registrado')}).\n` +
        `Teléfono del contacto: ${customer?.whatsapp ? '+' + customer.whatsapp : 'No registrado aún'}\n\n` +
        (isSystem ? `⛔ DIRECTRIZ CRÍTICA DE SEGURIDAD (USUARIO DEL SISTEMA): El usuario es personal del sistema (Administrador/Operador). ESTÁ ESTRICTAMENTE PROHIBIDO entregar contraseñas, cuentas, pines o suscripciones por este chat. Debes remitirlo siempre a su Panel Web administrativo.\n\n` : '') +
        `========================================\n` +
        `DIRECTRICES FUNDAMENTALES Y CERO ALUCINACIÓN:\n` +
        `========================================\n` +
        `- VERACIDAD TOTAL: NUNCA inventes precios, promociones, plataformas, cuentas ni métodos de pago que no estén en este mensaje. Si un dato no existe, di con amabilidad que consultarás con un asesor humano.\n` +
        `- PRIVACIDAD ESTRICTA: Solo puedes brindar información de suscripciones que pertenezcan al número de WhatsApp de este cliente. Jamás muestres datos de terceros.\n` +
        `- PAGOS OFICIALES: Únicamente aceptas transferencias por Nequi, Daviplata y Bancolombia. Solicita siempre el comprobante para procesar la orden.\n` +
        `${permissionRules}\n` +
        `${customInstructions}\n` +
        `${customPromptsContext}\n` +
        `${extraContext}\n` +
        `${faqsContext}\n` +
        `${customerSubscriptionsContext}\n` +
        (canCatalog ? `CATÁLOGO ACTUAL Y DISPONIBILIDAD EN COP:\n${catalogSummary}\n\n` : '') +
        `ESTILO DE RESPUESTA EN WHATSAPP:\n` +
        `- Sé conciso, cálido, profesional y comercial (máximo 2 a 3 párrafos cortos).\n` +
        `- Usa negritas (*texto*) para resaltar precios, plataformas y tiempos de entrega.\n` +
        `- Usa emojis con moderación (🎬, 🍿, 💳, ⚡, ✅) y cierra siempre con un llamado a la acción claro.`;

      const response = await axios.post(
        `${ollamaUrl}/api/chat`,
        {
          model: ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery },
          ],
          stream: false,
          options: {
            temperature: typeof botConfig.temperatura === 'number' ? botConfig.temperatura : 0.6,
            num_predict: typeof botConfig.maxTokens === 'number' ? botConfig.maxTokens : 300,
          },
        },
        { timeout: 15000 },
      );

      const resData = response.data as any;
      const aiReply = resData?.message?.content?.trim();
      if (aiReply) {
        await this.reply(targetJid, aiReply);
        return;
      }
    } catch (ollamaErr: any) {
      this.logger.warn(`Ollama IA local no disponible o en espera (${ollamaErr.message}).`);
    }

    // Fallback amigable
    await this.reply(
      targetJid,
      `¡Hola ${clientName}! 👋 He recibido tu consulta:\n"${userQuery}"\n\n` +
      `¿En qué te podemos colaborar?\n` +
      (canCatalog ? `1️⃣ Ver Catálogo (Cuentas con entrega inmediata)\n` : '') +
      (canAccounts ? `2️⃣ Mis Cuentas Activas y Soporte\n` : '') +
      (canWarranty ? `3️⃣ Reclamar Garantía\n` : '') +
      `4️⃣ Hablar con un Asesor Humano\n` +
      (!customer ? `5️⃣ Registrarme como Cliente (Descuentos y Promos)` : ''),
    );
  }

  // SIMULADOR DE CHAT IA PARA PRUEBAS Y ENTRENAMIENTO EN VIVO DESDE EL PANEL DE ADMINISTRACIÓN
  async simulateAiChat(
    userQuery: string,
    overrideConfig?: any,
  ): Promise<{ reply: string; usedModel: string; latencyMs: number }> {
    const startTime = Date.now();
    const botUser = await this.getBotUser();
    const botConfig = overrideConfig || (await this.whatsappService.getChatbotConfig());

    const ollamaUrl = botConfig.ollamaUrl || this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434');
    const ollamaModel = botConfig.ollamaModel || this.configService.get<string>('OLLAMA_MODEL', 'qwen2.5:7b');

    let catalogSummary = '';
    const services = await this.prisma.service.findMany({
      where: { activo: true },
      include: {
        plans: {
          where: { activo: true },
          include: { accounts: { where: { estado: 'DISPONIBLE' } } },
        },
      },
      take: 10,
    });

    catalogSummary = services
      .map((s) => {
        const plans = s.plans
          .map((p) => {
            const stock = p.accounts.length;
            const stockLabel = stock > 0 ? `Stock: ${stock} disp. inmediata` : 'SIN STOCK (gestión en máx 10 min)';
            return `${p.nombrePlan} ($${Number(p.precio).toLocaleString('es-CO')} COP - ${stockLabel})`;
          })
          .join(', ');
        return `${s.nombre}: [${plans}]`;
      })
      .join('; ');

    let faqsContext = '';
    if (Array.isArray(botConfig.faqs) && botConfig.faqs.length > 0) {
      const activeFaqs = botConfig.faqs.filter((f: any) => f.activo !== false);
      if (activeFaqs.length > 0) {
        faqsContext = '\nBASE DE CONOCIMIENTOS ENTRENADA (FAQ):\n' +
          activeFaqs.map((f: any) => `Pregunta: ${f.pregunta}\nRespuesta oficial: ${f.respuesta}`).join('\n\n') + '\n';
      }
    }

    let extraContext = '';
    if (botConfig.contextoAdicional && botConfig.contextoAdicional.trim().length > 0) {
      extraContext = `\nINFORMACIÓN ADICIONAL DE LA EMPRESA:\n${botConfig.contextoAdicional.trim()}\n`;
    }

    let permissionRules = `\nREGLAS DE NEGOCIO:\n`;
    if (botConfig.reglaStock10Min !== false) {
      permissionRules += `- Si el cliente pregunta por una cuenta sin stock disponible: indícale que se la gestionamos y activamos en NO MÁS DE 10 MINUTOS garantizado.\n`;
    }
    if (botConfig.reglaRegistroPromociones !== false) {
      permissionRules += `- Si el cliente no está registrado: invítale a registrarse para acceder a promociones y descuentos.\n`;
    }
    if (botConfig.reglaVentasSimplificada !== false) {
      permissionRules += `- Para compras: pide el método de pago si es antiguo; pide registro si es nuevo.\n`;
    }

    let customPromptsContext = '';
    if (Array.isArray(botConfig.promptsPersonalizados) && botConfig.promptsPersonalizados.length > 0) {
      const activePrompts = botConfig.promptsPersonalizados.filter((p: any) => p.activo !== false);
      if (activePrompts.length > 0) {
        customPromptsContext = '\nREGLAS Y PROMPTS PERSONALIZADOS DE LA EMPRESA:\n' +
          activePrompts.map((p: any, idx: number) => `[REGLA ${idx + 1}: ${p.titulo.toUpperCase()}]\n${p.contenido}`).join('\n\n') + '\n';
      }
    }

    const customInstructions = botConfig.systemPromptPersonalizado && botConfig.systemPromptPersonalizado.trim().length > 0
      ? `\nDIRECTRICES PERSONALIZADAS:\n${botConfig.systemPromptPersonalizado.trim()}\n`
      : '';

    const platformName = await this.getPlatformName();
    const systemPrompt =
      `Eres ${botConfig.nombreBot || botUser.nombre}, el asesor y asistente virtual oficial de ${platformName} en WhatsApp.\n` +
      `Estás interactuando en un simulador de pruebas con un cliente potencial.\n\n` +
      `========================================\n` +
      `DIRECTRICES FUNDAMENTALES Y CERO ALUCINACIÓN:\n` +
      `========================================\n` +
      `- VERACIDAD TOTAL: NUNCA inventes precios, promociones, plataformas, cuentas ni métodos de pago que no estén en este mensaje. Si un dato no existe, di con amabilidad que consultarás con un asesor humano.\n` +
      `- PRIVACIDAD ESTRICTA: Solo puedes brindar información de suscripciones que pertenezcan al número del cliente.\n` +
      `- PAGOS OFICIALES: Únicamente aceptas transferencias por Nequi, Daviplata y Bancolombia.\n` +
      `${permissionRules}\n` +
      `${customInstructions}\n` +
      `${customPromptsContext}\n` +
      `${extraContext}\n` +
      `${faqsContext}\n` +
      `CATÁLOGO ACTUAL Y DISPONIBILIDAD EN COP:\n${catalogSummary}\n\n` +
      `ESTILO DE RESPUESTA EN WHATSAPP:\n` +
      `- Sé conciso, cálido, profesional y comercial (máximo 2 a 3 párrafos cortos).\n` +
      `- Usa negritas (*texto*) para resaltar precios, plataformas y tiempos de entrega.\n` +
      `- Usa emojis con moderación (🎬, 🍿, 💳, ⚡, ✅) y cierra siempre con un llamado a la acción claro.`;

    try {
      const response = await axios.post(
        `${ollamaUrl}/api/chat`,
        {
          model: ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery },
          ],
          stream: false,
          options: {
            temperature: typeof botConfig.temperatura === 'number' ? botConfig.temperatura : 0.6,
            num_predict: typeof botConfig.maxTokens === 'number' ? botConfig.maxTokens : 300,
          },
        },
        { timeout: 15000 },
      );

      const latencyMs = Date.now() - startTime;
      const resData = response.data as any;
      const reply = resData?.message?.content?.trim() || 'No se obtuvo respuesta del modelo.';
      return { reply, usedModel: ollamaModel, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      let errorDetail = err.message;
      if (err.response?.status === 404 || err.message?.includes('404')) {
        errorDetail = `El modelo "${ollamaModel}" aún no está descargado en tu Ollama local. Haz clic en "Descargar Modelo" o cambia a un modelo ya instalado (ej: "qwen2.5:0.5b").`;
      }
      return {
        reply: `⚠️ Error conectando con Ollama en ${ollamaUrl}: ${errorDetail}`,
        usedModel: ollamaModel,
        latencyMs,
      };
    }
  }

  // ============================================================
  // 7. MÉTODOS AUXILIARES (Búsqueda, Envío, Delay Anti-Ban)
  // ============================================================

  // VERIFICAR SI EL REMITENTE ES UN USUARIO DEL SISTEMA (ADMIN, VENDEDOR, SOPORTE, ASESOR)
  // SEGURIDAD: El bot SOLO puede mostrar información de CLIENTES, NUNCA de usuarios del sistema.
  private async isSystemUser(
    remoteJid: string,
    customer?: any,
    messageData?: any,
    clientName?: string,
  ): Promise<boolean> {
    try {
      // 1. Si el cliente tiene un usuario asociado y su rol NO es CLIENTE
      if (customer?.user?.rol && customer.user.rol !== UserRole.CLIENTE) {
        return true;
      }

      // 2. Comprobar por teléfono en la tabla User buscando roles internos
      const cleanPhone = customer?.whatsapp || (await this.resolvePhoneFromJid(remoteJid, messageData));
      if (cleanPhone && cleanPhone.length >= 7) {
        const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
        const last7 = cleanPhone.length >= 7 ? cleanPhone.slice(-7) : cleanPhone;

        const internalUserByPhone = await this.prisma.user.findFirst({
          where: {
            rol: { not: UserRole.CLIENTE },
            OR: [
              { phone: cleanPhone },
              { phone: `+${cleanPhone}` },
              { phone: { contains: last10 } },
              { phone: { contains: last7 } },
            ],
          },
        });
        if (internalUserByPhone) return true;
      }

      // 3. Comprobar por Nombre si coincide con algún usuario administrativo del sistema
      const nameToCheck = clientName || customer?.user?.nombre || messageData?.pushName;
      if (nameToCheck && typeof nameToCheck === 'string' && nameToCheck.trim().length > 3) {
        const internalUserByName = await this.prisma.user.findFirst({
          where: {
            rol: { not: UserRole.CLIENTE },
            nombre: { equals: nameToCheck.trim(), mode: 'insensitive' },
          },
        });
        if (internalUserByName) return true;
      }

      // 4. Comprobar por Correo si coincide con algún usuario administrativo
      const emailToCheck = customer?.user?.email;
      if (emailToCheck && typeof emailToCheck === 'string' && emailToCheck.trim().length > 3) {
        const internalUserByEmail = await this.prisma.user.findFirst({
          where: {
            rol: { not: UserRole.CLIENTE },
            email: { equals: emailToCheck.trim(), mode: 'insensitive' },
          },
        });
        if (internalUserByEmail) return true;
      }
    } catch (err: any) {
      this.logger.error(`Error verificando rol de usuario del sistema: ${err.message}`);
    }

    return false;
  }

  // RESOLVER NÚMERO REAL DE WHATSAPP CUANDO LLEGA UN IDENTIFICADOR DE DISPOSITIVO (@lid)
  private async resolvePhoneFromJid(remoteJid: string, messageData?: any): Promise<string | null> {
    if (!remoteJid) return null;

    // 1. Si ya es @s.whatsapp.net, extraer los dígitos limpios
    if (remoteJid.includes('@s.whatsapp.net')) {
      const digits = remoteJid.split('@')[0].split(':')[0].replace(/\D/g, '');
      if (digits.length >= 7) return digits;
    }

    // 2. Si viene altJid en sender / participant tradicional
    const altJids = [
      messageData?.sender,
      messageData?.key?.participant,
      messageData?.participant,
    ].filter(Boolean) as string[];

    for (const alt of altJids) {
      if (alt.includes('@s.whatsapp.net')) {
        const digits = alt.split('@')[0].split(':')[0].replace(/\D/g, '');
        if (digits.length >= 7) return digits;
      }
    }

    // 3. Si es un identificador de dispositivo WhatsApp (@lid)
    if (remoteJid.includes('@lid')) {
      const lidDigits = remoteJid.split('@')[0].split(':')[0].replace(/\D/g, '');
      if (this.lidCache.has(lidDigits)) {
        return this.lidCache.get(lidDigits)!;
      }

      // Consultar archivo de mapeo inverso de Baileys en el contenedor de Evolution API
      try {
        const mappedPhone: string = await new Promise((resolve) => {
          exec(
            `docker exec streamcontrol-evolution-api sh -c "cat /evolution/instances/*/lid-mapping-${lidDigits}_reverse.json 2>/dev/null"`,
            { timeout: 1500 },
            (err: any, stdout: string) => {
              if (err || !stdout) return resolve('');
              const clean = stdout.replace(/["\s\r\n]/g, '');
              resolve(clean);
            },
          );
        });

        if (mappedPhone && mappedPhone.length >= 7) {
          this.logger.log(`[LID] Teléfono real resuelto para LID ${remoteJid}: +${mappedPhone}`);
          this.lidCache.set(lidDigits, mappedPhone);
          return mappedPhone;
        }
      } catch (err: any) {
        this.logger.debug(`Error buscando mapeo inverso LID: ${err.message}`);
      }

      // Consultar en contactos sincronizados de Evolution API
      const pushName = messageData?.pushName;
      if (pushName && typeof pushName === 'string' && pushName.trim().length > 2) {
        try {
          const apiUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080');
          const apiKey = this.configService.get<string>('EVOLUTION_API_KEY', 'streamcontrol_secret_wa_2025');
          const res = await axios.post(
            `${apiUrl}/chat/findContacts/streaming-platform`,
            { where: { pushName: pushName.trim() } },
            { headers: { apikey: apiKey }, timeout: 2000 },
          );
          const contactsList: any[] = Array.isArray(res.data) ? res.data : [];
          const found = contactsList.find((c: any) => c.remoteJid?.includes('@s.whatsapp.net'));
          if (found?.remoteJid) {
            const digits = found.remoteJid.split('@')[0].split(':')[0].replace(/\D/g, '');
            if (digits.length >= 7) {
              this.logger.log(`[LID] Teléfono resuelto por pushName '${pushName}': +${digits}`);
              this.lidCache.set(lidDigits, digits);
              return digits;
            }
          }
        } catch (_) {}
      }
    }

    return null;
  }

  // BÚSQUEDA ESTRICTA DE CLIENTE EXCLUSIVAMENTE POR NÚMERO DE WHATSAPP EN LA BASE DE DATOS
  private async findCustomer(remoteJid: string, messageData?: any): Promise<any> {
    if (!remoteJid) return null;

    const cleanPhone = await this.resolvePhoneFromJid(remoteJid, messageData);
    if (cleanPhone && cleanPhone.length >= 7) {
      const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
      const last8 = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;
      const last7 = cleanPhone.length >= 7 ? cleanPhone.slice(-7) : cleanPhone;

      const customer = await this.prisma.customer.findFirst({
        where: {
          user: { rol: UserRole.CLIENTE },
          OR: [
            { whatsapp: cleanPhone },
            { whatsapp: `+${cleanPhone}` },
            { whatsapp: { contains: last10 } },
            { whatsapp: { contains: last8 } },
            { whatsapp: { contains: last7 } },
            { user: { phone: cleanPhone } },
            { user: { phone: `+${cleanPhone}` } },
            { user: { phone: { contains: last10 } } },
            { user: { phone: { contains: last8 } } },
            { user: { phone: { contains: last7 } } },
          ],
        },
        include: {
          user: { select: { id: true, nombre: true, email: true, phone: true } },
        },
      });

      if (customer) {
        if (remoteJid.includes('@lid')) {
          const lidDigits = remoteJid.split('@')[0].split(':')[0].replace(/\D/g, '');
          this.lidCache.set(lidDigits, customer.whatsapp);
        }
        return customer;
      }
    }

    // Si es un LID y no se pudo resolver el teléfono exacto, verificar si el pushName coincide exactamente con un cliente registrado
    const pushName = messageData?.pushName;
    if (pushName && typeof pushName === 'string' && pushName.trim().length > 3) {
      const customerByName = await this.prisma.customer.findFirst({
        where: {
          user: {
            rol: UserRole.CLIENTE,
            nombre: { equals: pushName.trim(), mode: 'insensitive' },
          },
        },
        include: {
          user: { select: { id: true, nombre: true, email: true, phone: true } },
        },
      });

      if (customerByName) {
        if (remoteJid.includes('@lid')) {
          const lidDigits = remoteJid.split('@')[0].split(':')[0].replace(/\D/g, '');
          this.lidCache.set(lidDigits, customerByName.whatsapp);
        }
        return customerByName;
      }
    }

    return null;
  }

  private getSession(targetJid: string): UserSession {
    const now = Date.now();
    let session = this.sessions.get(targetJid);

    if (!session || (now - session.lastActive > this.SESSION_TIMEOUT_MS)) {
      session = {
        jid: targetJid,
        step: 'MENU',
        humanTakeover: false,
        lastActive: now,
      };
      this.sessions.set(targetJid, session);
    } else {
      session.lastActive = now;
    }

    return session;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Simular presencia de tipeo y delay anti-ban dinámico
  private async sendTyping(targetJid: string): Promise<void> {
    try {
      const cfg = await this.whatsappService.getChatbotConfig().catch(() => null);
      if (cfg && cfg.simularTipeo === false) return;
      const min = cfg?.delayMinMs ?? 1500;
      const max = cfg?.delayMaxMs ?? 3500;
      const delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
      await new Promise(r => setTimeout(r, delayMs));
    } catch (_) {}
  }

  // Enviar mensaje a través del servicio existente de WhatsApp
  private async reply(targetJid: string, text: string): Promise<any> {
    return this.whatsappService.sendTextMessage(targetJid, text, true);
  }

  // Verificar estado del servicio de IA local
  async checkOllamaStatus(requestedModel?: string): Promise<{ available: boolean; model: string; hasModel: boolean; availableModels: string[]; error?: string }> {
    const config = await this.whatsappService.getChatbotConfig();
    const ollamaUrl = config.ollamaUrl || this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434');
    const targetModel = requestedModel || config.ollamaModel || this.configService.get<string>('OLLAMA_MODEL', 'qwen2.5:7b');

    try {
      const res = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 3000 });
      const resData = res.data as any;
      const models = resData?.models || [];
      const availableModels: string[] = models.map((m: any) => m.name || m.model);
      const cleanTarget = targetModel.toLowerCase().trim();
      const hasModel = availableModels.some((name) => {
        const n = name.toLowerCase().trim();
        return n === cleanTarget || n.startsWith(`${cleanTarget}:`) || cleanTarget.startsWith(`${n}:`);
      });

      return {
        available: true,
        model: targetModel,
        hasModel,
        availableModels,
      };
    } catch (e: any) {
      return {
        available: false,
        model: targetModel,
        hasModel: false,
        availableModels: [],
        error: e.message,
      };
    }
  }

  // Descargar un modelo de IA en Ollama local
  async pullModel(modelName: string): Promise<{ success: boolean; message: string }> {
    const config = await this.whatsappService.getChatbotConfig();
    const ollamaUrl = config.ollamaUrl || this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434');
    const target = modelName.trim();

    if (!target) {
      return { success: false, message: 'Nombre de modelo no especificado.' };
    }

    try {
      this.logger.log(`Iniciando descarga en segundo plano para el modelo Ollama "${target}"...`);
      // Llamada asíncrona a Ollama para descargar el modelo
      axios
        .post(`${ollamaUrl}/api/pull`, { model: target, stream: false }, { timeout: 600000 })
        .then(() => {
          this.logger.log(`¡Modelo "${target}" descargado exitosamente en Ollama!`);
        })
        .catch((err) => {
          this.logger.error(`Fallo al descargar modelo "${target}": ${err.message}`);
        });

      return {
        success: true,
        message: `La descarga del modelo "${target}" ha iniciado en segundo plano en Ollama. Dependiendo de tu conexión, puede tardar unos minutos. Puedes verificar los modelos disponibles en cualquier momento.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error al conectar con Ollama para iniciar la descarga: ${err.message}`,
      };
    }
  }
}
