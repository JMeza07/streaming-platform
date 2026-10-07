import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus, AuditCategory, AuditSeverity, AccountStatus, OrderStatus } from '@prisma/client';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AuditService } from '../audit/audit.service';
import * as cron from 'node-cron';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsappService,
    private auditService: AuditService,
  ) {}

  onModuleInit() {
    this.scheduleExpirationAlertCron();
  }

  // =========================================================================
  // TAREA PROGRAMADA: ESCANEO DIARIO DE VENCIMIENTOS (08:30 AM) (RF-025, RF-026)
  // =========================================================================
  private scheduleExpirationAlertCron() {
    cron.schedule('30 8 * * *', async () => {
      try {
        this.logger.log('[CRON Vencimientos] Ejecutando escaneo diario de renovaciones...');
        await this.processAutomaticExpirationAlerts();
      } catch (err: any) {
        this.logger.error(`[CRON Vencimientos] Error en escaneo automático: ${err.message}`);
      }
    });
  }

  // LISTAR TODAS LAS CUENTAS VENDIDAS / SUSCRIPCIONES (Admin)
  async findAll(filters: {
    serviceId?: string;
    vendedorId?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    canal?: 'todos' | 'online' | 'vendedor';
    search?: string;
  }) {
    const where: any = {};

    if (filters.serviceId) {
      where.plan = { serviceId: filters.serviceId };
    }

    if (filters.estado && filters.estado !== 'todos') {
      where.estado = filters.estado as SubscriptionStatus;
    }

    if (filters.fechaDesde || filters.fechaHasta) {
      const dateCond: any = {};
      if (filters.fechaDesde) {
        const [y, m, d] = filters.fechaDesde.split('-').map(Number);
        dateCond.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }
      if (filters.fechaHasta) {
        const [y, m, d] = filters.fechaHasta.split('-').map(Number);
        dateCond.lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      }
      where.OR = [
        { fechaInicio: dateCond },
        { createdAt: dateCond },
      ];
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        plan: {
          include: {
            service: { select: { id: true, nombre: true, logoUrl: true } },
          },
        },
        account: {
          select: {
            id: true,
            emailCuenta: true,
            passwordCuenta: true,
            perfilAsignado: true,
            pinPerfil: true,
            estado: true,
          },
        },
        customer: {
          include: {
            user: {
              select: { id: true, nombre: true, email: true, phone: true, activo: true },
            },
          },
        },
        order: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            vendedorId: true,
            vendedorNombre: true,
            vendedorPorcentaje: true,
            vendedorComision: true,
            descripcionVenta: true,
            metodoPago: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Mapear y calcular métricas derivadas
    let items = subscriptions.map((sub) => {
      const vencimiento = new Date(sub.fechaVencimiento);
      vencimiento.setHours(0, 0, 0, 0);
      const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      const isVendedor = !!(sub.order?.vendedorNombre || sub.order?.vendedorId);
      const canalVenta = isVendedor ? 'vendedor' : 'online';

      return {
        id: sub.id,
        fechaInicio: sub.fechaInicio,
        fechaVencimiento: sub.fechaVencimiento,
        diasRestantes,
        estado: sub.estado,
        autoRenovar: sub.autoRenovar,
        createdAt: sub.createdAt,
        // Datos del Plan y Servicio
        plataforma: sub.plan.service.nombre,
        plataformaId: sub.plan.service.id,
        plataformaNombre: sub.plan.service.nombre,
        plataformaLogo: sub.plan.service.logoUrl,
        planId: sub.plan.id,
        planNombre: sub.plan.nombrePlan,
        valor: sub.order ? Number(sub.order.total) : Number(sub.plan.precio),
        precio: sub.order ? Number(sub.order.total) : Number(sub.plan.precio),
        // Credenciales entregadas
        accountId: sub.account.id,
        emailCuenta: sub.account.emailCuenta,
        passwordCuenta: sub.account.passwordCuenta,
        perfilAsignado: sub.account.perfilAsignado,
        pinPerfil: sub.account.pinPerfil,
        accountEstado: sub.account.estado,
        credenciales: {
          id: sub.account.id,
          email: sub.account.emailCuenta,
          password: sub.account.passwordCuenta,
          perfil: sub.account.perfilAsignado,
          pin: sub.account.pinPerfil,
        },
        // Cliente
        customerId: sub.customer.id,
        clienteUserId: sub.customer.user.id,
        clienteNombre: sub.customer.user.nombre,
        clienteEmail: sub.customer.user.email,
        clienteWhatsapp: sub.customer.whatsapp || sub.customer.user.phone,
        clienteActivo: sub.customer.user.activo,
        cliente: {
          id: sub.customer.id,
          userId: sub.customer.user.id,
          nombre: sub.customer.user.nombre,
          email: sub.customer.user.email,
          telefono: sub.customer.whatsapp || sub.customer.user.phone,
          activo: sub.customer.user.activo,
        },
        // Canal / Vendedor
        orderId: sub.order?.id || null,
        canalVenta,
        vendedorId: sub.order?.vendedorId || null,
        vendedorNombre: sub.order?.vendedorNombre || null,
        vendedorComision: sub.order?.vendedorComision ? Number(sub.order.vendedorComision) : 0,
        vendedor: sub.order?.vendedorNombre
          ? {
              id: sub.order.vendedorId,
              nombre: sub.order.vendedorNombre,
            }
          : null,
        descripcionVenta: sub.order?.descripcionVenta || null,
        metodoPago: sub.order?.metodoPago || 'Nequi / Transferencia',
      };
    });

    // Filtro por canal si fue solicitado
    if (filters.canal && filters.canal !== 'todos') {
      const c = filters.canal.toLowerCase();
      const target = c === 'en_linea' ? 'online' : c;
      items = items.filter((i) => i.canalVenta.toLowerCase() === target);
    }

    // Filtro por vendedor específico
    if (filters.vendedorId) {
      items = items.filter((i) => i.vendedorId === filters.vendedorId);
    }

    // Filtro por texto de búsqueda
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.clienteNombre.toLowerCase().includes(q) ||
          (i.clienteEmail && i.clienteEmail.toLowerCase().includes(q)) ||
          i.emailCuenta.toLowerCase().includes(q) ||
          i.plataformaNombre.toLowerCase().includes(q) ||
          i.planNombre.toLowerCase().includes(q) ||
          (i.vendedorNombre && i.vendedorNombre.toLowerCase().includes(q))
      );
    }

    return items;
  }

  // SUSPENDER O REACTIVAR SUSCRIPCIÓN
  async updateStatus(id: string, nuevoEstado: SubscriptionStatus) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    return this.prisma.subscription.update({
      where: { id },
      data: { estado: nuevoEstado },
    });
  }

  // MODIFICAR CREDENCIALES DE LA CUENTA ENTREGADA
  async updateCredentials(
    id: string,
    dto: {
      emailCuenta?: string;
      passwordCuenta?: string;
      perfilAsignado?: string;
      pinPerfil?: string;
    }
  ) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    return this.prisma.account.update({
      where: { id: sub.accountId },
      data: {
        ...(dto.emailCuenta && { emailCuenta: dto.emailCuenta }),
        ...(dto.passwordCuenta && { passwordCuenta: dto.passwordCuenta }),
        ...(dto.perfilAsignado !== undefined && { perfilAsignado: dto.perfilAsignado }),
        ...(dto.pinPerfil !== undefined && { pinPerfil: dto.pinPerfil }),
      },
    });
  }

  // =========================================================================
  // ALERTAS DE VENCIMIENTO Y RENOVACIÓN (SRS RF-025 / RF-026 / Punto 8)
  // =========================================================================
  async getExpirationAlerts(filters?: { dias?: number; serviceId?: string }) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const maxDias = filters?.dias !== undefined ? filters.dias : 30;
    const fechaLimite = new Date(hoy.getTime() + (maxDias + 1) * 24 * 60 * 60 * 1000);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        estado: { in: [SubscriptionStatus.ACTIVA, SubscriptionStatus.VENCIDA] },
        fechaVencimiento: { lte: fechaLimite },
        ...(filters?.serviceId && { plan: { serviceId: filters.serviceId } }),
      },
      include: {
        customer: { include: { user: true } },
        plan: { include: { service: true } },
        account: true,
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    const settings = await this.prisma.systemSetting.findFirst().catch(() => null);
    const systemName = settings?.systemName || 'MezaStreaming';

    const categorizadas = {
      vencenHoy: [] as any[],
      vencen1Dia: [] as any[],
      vencen3Dias: [] as any[],
      vencen7Dias: [] as any[],
      vencen15Dias: [] as any[],
      vencen30Dias: [] as any[],
      yaVencidas: [] as any[],
      items: [] as any[],
      totalAlertas: subscriptions.length,
      totalEn3Dias: 0,
      totalEn7Dias: 0,
      totalEn15Dias: 0,
      totalEn30Dias: 0,
    };

    for (const sub of subscriptions) {
      const vence = new Date(sub.fechaVencimiento);
      vence.setHours(0, 0, 0, 0);
      const diffTime = vence.getTime() - hoy.getTime();
      const faltanDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const rawPhone = sub.customer.whatsapp || sub.customer.user.phone || '';
      const phone = rawPhone.replace(/\D/g, '');
      const accId = sub.account?.id || sub.accountId || '';
      const accCode = accId ? `#ACC-${accId.substring(0, 8).toUpperCase()}` : '';

      const tiempoTexto =
        faltanDias < 0
          ? `expiró hace ${Math.abs(faltanDias)} ${Math.abs(faltanDias) === 1 ? 'día' : 'días'}`
          : faltanDias === 0
          ? 'vence el día de HOY ⚠️'
          : faltanDias === 1
          ? 'vence MAÑANA (en 1 día) ⏳'
          : `vence en ${faltanDias} días 🗓️`;

      const formattedPrice = Number(sub.plan.precio).toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      });

      const formattedDate = new Date(sub.fechaVencimiento).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const waMsg = [
        `Hola *${sub.customer.user.nombre}* 👋,`,
        `Te recordamos desde *${systemName}* que tu suscripción a *${sub.plan.service.nombre}* (${sub.plan.nombrePlan}) ${tiempoTexto} (📅 *${formattedDate}*).`,
        ``,
        accCode ? `🆔 *ID Cuenta:* ${accCode}` : null,
        sub.account?.perfilAsignado ? `👤 *Perfil:* ${sub.account.perfilAsignado}` : null,
        `💰 *Valor de Renovación:* ${formattedPrice}`,
        ``,
        `¿Deseas renovar tu servicio para continuar disfrutando de tu cuenta sin interrupciones ni pérdida de perfil? ✨`,
        `Responde a este mensaje para confirmar tu renovación o para recibir los datos de pago (Nequi / Bancolombia).`,
      ].filter(Boolean).join('\n');

      const item = {
        id: sub.id,
        customerId: sub.customerId,
        clienteNombre: sub.customer.user.nombre,
        clienteEmail: sub.customer.user.email,
        whatsapp: rawPhone,
        phoneClean: phone,
        servicio: sub.plan.service.nombre,
        servicioLogo: sub.plan.service.logoUrl,
        plan: sub.plan.nombrePlan,
        precioRenovacion: Number(sub.plan.precio),
        fechaVencimiento: sub.fechaVencimiento,
        faltanDias,
        estado: sub.estado,
        notificadoWhatsapp: sub.notificadoWhatsapp,
        ultimoAvisoVencimiento: sub.ultimoAvisoVencimiento,
        perfilAsignado: sub.account?.perfilAsignado || 'Principal',
        pinPerfil: sub.account?.pinPerfil || null,
        emailCuenta: sub.account?.emailCuenta || 'N/A',
        passwordCuenta: sub.account?.passwordCuenta || 'N/A',
        accountId: accId,
        accountCode: accCode,
        waMessage: waMsg,
        waLink: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}` : null,
      };

      categorizadas.items.push(item);

      if (faltanDias < 0) {
        categorizadas.yaVencidas.push(item);
      } else if (faltanDias === 0) {
        categorizadas.vencenHoy.push(item);
        categorizadas.totalEn3Dias++;
        categorizadas.totalEn7Dias++;
        categorizadas.totalEn15Dias++;
        categorizadas.totalEn30Dias++;
      } else if (faltanDias === 1) {
        categorizadas.vencen1Dia.push(item);
        categorizadas.totalEn3Dias++;
        categorizadas.totalEn7Dias++;
        categorizadas.totalEn15Dias++;
        categorizadas.totalEn30Dias++;
      } else if (faltanDias <= 3) {
        categorizadas.vencen3Dias.push(item);
        categorizadas.totalEn3Dias++;
        categorizadas.totalEn7Dias++;
        categorizadas.totalEn15Dias++;
        categorizadas.totalEn30Dias++;
      } else if (faltanDias <= 7) {
        categorizadas.vencen7Dias.push(item);
        categorizadas.totalEn7Dias++;
        categorizadas.totalEn15Dias++;
        categorizadas.totalEn30Dias++;
      } else if (faltanDias <= 15) {
        categorizadas.vencen15Dias.push(item);
        categorizadas.totalEn15Dias++;
        categorizadas.totalEn30Dias++;
      } else {
        categorizadas.vencen30Dias.push(item);
        categorizadas.totalEn30Dias++;
      }
    }

    return categorizadas;
  }

  // =========================================================================
  // MARCAR COMO NOTIFICADO (SRS RF-025 / RF-026)
  // =========================================================================
  async markNotified(subscriptionId: string, currentUser?: any) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: { include: { user: true } },
        plan: { include: { service: true } },
      },
    });

    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        notificadoWhatsapp: true,
        ultimoAvisoVencimiento: new Date(),
      },
    });

    await this.prisma.notificationLog.create({
      data: {
        customerId: sub.customerId,
        subscriptionId: sub.id,
        tipoEvento: 'AVISO_VENCIMIENTO_MANUAL',
        canal: 'WHATSAPP',
        mensajeEnviado: `Notificación de vencimiento marcada por ${currentUser?.nombre || 'Operador'} para ${sub.plan.service.nombre}`,
        estadoEnvio: 'enviado',
      },
    });

    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      usuarioNombre: currentUser?.nombre,
      modulo: AuditCategory.CLIENTES,
      accion: 'MARCAR_NOTIFICADO_RENOVACION',
      severidad: AuditSeverity.INFO,
      descripcion: `Cliente ${sub.customer.user.nombre} marcado como notificado para renovación de ${sub.plan.service.nombre}`,
      entidadTipo: 'Subscription',
      entidadId: sub.id,
    });

    return {
      message: 'Notificación registrada con éxito.',
      subscription: updated,
    };
  }

  // =========================================================================
  // ENVIAR RECORDATORIO DE VENCIMIENTO POR WHATSAPP (EVOLUTION API)
  // =========================================================================
  async sendExpirationReminder(subscriptionId: string, currentUser?: any) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: { include: { user: true } },
        plan: { include: { service: true } },
        account: true,
      },
    });

    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    const phone = sub.customer.whatsapp || sub.customer.user.phone;
    if (!phone) {
      throw new BadRequestException('El cliente no tiene un número de WhatsApp registrado.');
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vence = new Date(sub.fechaVencimiento);
    vence.setHours(0, 0, 0, 0);
    const faltanDias = Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    const tiempoTexto =
      faltanDias < 0
        ? 'ha expirado'
        : faltanDias === 0
        ? 'vence el día de HOY'
        : `vence en ${faltanDias} ${faltanDias === 1 ? 'día' : 'días'}`;

    const mensaje = `Hola ${sub.customer.user.nombre} 👋,\n\nTe recordamos desde *Oasis Virtual Store* que tu suscripción a *${sub.plan.service.nombre}* (${sub.plan.nombrePlan}) ${tiempoTexto}.\n\n📅 Fecha de vencimiento: ${sub.fechaVencimiento.toLocaleDateString('es-CO')}\n💰 Valor de renovación: $${Number(sub.plan.precio).toLocaleString('es-CO')}\n\nPara renovar y mantener tu pantalla activa sin interrupciones, por favor responde a este mensaje o ingresa a tu panel de cliente. ¡Gracias por confiar en nosotros! ✨`;

    await this.whatsappService.sendTextMessage(phone, mensaje);

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        notificadoWhatsapp: true,
        ultimoAvisoVencimiento: new Date(),
      },
    });

    await this.prisma.notificationLog.create({
      data: {
        customerId: sub.customerId,
        subscriptionId: sub.id,
        tipoEvento: 'AVISO_VENCIMIENTO_WHATSAPP',
        canal: 'WHATSAPP',
        mensajeEnviado: mensaje,
        estadoEnvio: 'enviado',
      },
    });

    return {
      message: `Recordatorio de vencimiento enviado exitosamente a ${phone}.`,
      destinatario: phone,
      faltanDias,
    };
  }

  // =========================================================================
  // EJECUCIÓN AUTOMÁTICA DE ALERTAS (CRON JOB)
  // =========================================================================
  async processAutomaticExpirationAlerts() {
    const config = await this.prisma.whatsappConfig.findFirst({
      where: { notificacionesActivas: true },
    });

    if (!config) {
      this.logger.log('[CRON Vencimientos] Notificaciones automáticas desactivadas en configuración.');
      return;
    }

    const alerts = await this.getExpirationAlerts({ dias: 7 });
    const prioritarias = [...alerts.vencenHoy, ...alerts.vencen1Dia, ...alerts.vencen3Dias];

    let enviadas = 0;
    for (const item of prioritarias) {
      if (item.notificadoWhatsapp) continue; // Evitar spam si ya fue notificado hoy

      try {
        await this.sendExpirationReminder(item.id, { nombre: 'Cron Automático SGVS' });
        enviadas++;
      } catch (e: any) {
        this.logger.error(`Error enviando recordatorio a ${item.whatsapp}: ${e.message}`);
      }
    }

    this.logger.log(`[CRON Vencimientos] Finalizado. Se enviaron ${enviadas} notificaciones automáticas.`);
  }

  // =========================================================================
  // RENOVACIÓN DIRECTA POR ASESOR / ADMINISTRADOR (Cuentas Vendidas y Suscripciones)
  // =========================================================================
  async renewSubscriptionDirectly(
    subscriptionId: string,
    dto: { dias?: number; metodoPago?: string; notas?: string; precio?: number; comprobanteUrl?: string },
    currentUser: any,
  ) {
    if (!dto.comprobanteUrl || !dto.comprobanteUrl.trim()) {
      throw new BadRequestException('Es obligatorio adjuntar el comprobante de pago para procesar y aprobar la renovación.');
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: { include: { user: true } },
        plan: { include: { service: true } },
        account: true,
      },
    });

    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    const extensionDays = Number(dto.dias) || Number(sub.plan.duracionDias) || 30;
    const precio = dto.precio !== undefined && dto.precio !== null && !isNaN(Number(dto.precio))
      ? Number(dto.precio)
      : Number(sub.plan.precio);

    const now = new Date();
    const baseDate = new Date(sub.fechaVencimiento) > now ? new Date(sub.fechaVencimiento) : now;
    const nuevaFechaVencimiento = new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);

    // Actualizar suscripción
    const updatedSub = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        fechaVencimiento: nuevaFechaVencimiento,
        estado: SubscriptionStatus.ACTIVA,
        notificadoWhatsapp: false,
      },
    });

    // Asegurar que la cuenta asignada esté OCUPADA
    if (sub.accountId) {
      await this.prisma.account.update({
        where: { id: sub.accountId },
        data: { estado: AccountStatus.OCUPADA },
      }).catch(() => {});
    }

    // Crear la orden de renovación para registro contable
    const accCode = sub.accountId ? `#ACC-${sub.accountId.substring(0, 8).toUpperCase()}` : 'N/A';
    const renewalOrder = await this.prisma.order.create({
      data: {
        customerId: sub.customerId,
        total: precio,
        estado: OrderStatus.PAGADO,
        clase: 'RENOVACION',
        metodoPago: dto.metodoPago || 'EFECTIVO_TRANSFERENCIA',
        comprobanteUrl: dto.comprobanteUrl,
        comprobanteVerificado: true,
        comprobanteVerificadoPor: currentUser?.nombre || 'Administración',
        comprobanteVerificadoAt: new Date(),
        descripcionVenta: `[RENOVACIÓN ASESOR] Suscripción ID: ${sub.id} | Cuenta: ${accCode} (${sub.account?.emailCuenta || 'N/A'}) | Servicio: ${sub.plan.service.nombre} - ${sub.plan.nombrePlan} (+${extensionDays} días)${dto.notas ? ` | Notas: ${dto.notas}` : ''}`,
        vendedorId: currentUser?.id || currentUser?.userId,
        vendedorNombre: currentUser?.nombre || 'Administración',
        items: {
          create: [
            {
              planId: sub.planId,
              cantidad: 1,
              precioUnitario: precio,
              subtotal: precio,
            },
          ],
        },
      },
    });

    // Registrar en auditoría inmutable
    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      usuarioNombre: currentUser?.nombre,
      modulo: AuditCategory.VENTAS,
      accion: 'RENOVAR_SUSCRIPCION',
      severidad: AuditSeverity.INFO,
      descripcion: `Suscripción de ${sub.customer?.user?.nombre || 'Cliente'} para ${sub.plan.service.nombre} renovada por ${extensionDays} días hasta ${nuevaFechaVencimiento.toLocaleDateString('es-CO')}. Orden #ORD-${renewalOrder.id.substring(0, 8).toUpperCase()}`,
      entidadTipo: 'Subscription',
      entidadId: sub.id,
    });

    return {
      message: `Suscripción renovada exitosamente por ${extensionDays} días hasta el ${nuevaFechaVencimiento.toLocaleDateString('es-CO')}`,
      subscription: updatedSub,
      order: renewalOrder,
    };
  }
}
