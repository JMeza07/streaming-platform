import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ImapService } from '../accounts/imap.service';
import { RequestWarrantyDto } from './dto/request-warranty.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { SubscriptionStatus, OrderStatus, AccountStatus, RootAccountStatus } from '@prisma/client';

function extractMotivoCancelacion(descripcionVenta?: string | null): string {
  if (!descripcionVenta) return 'Cancelación de la orden por parte del administrador.';
  const m = descripcionVenta.match(/\[VENTA CANCELADA[^\]]*\]:\s*(.+)$/i);
  if (m && m[1]) return m[1].trim();
  const m2 = descripcionVenta.match(/Motivo:\s*([^|]+)/i);
  if (m2 && m2[1]) return m2[1].trim();
  return descripcionVenta;
}

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private imapService: ImapService,
  ) {}

  // OBTENER SUSCRIPCIONES ACTIVAS DEL CLIENTE
  async getMySubscriptions(customerId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { 
        customerId,
        estado: { in: [SubscriptionStatus.ACTIVA, SubscriptionStatus.EN_GARANTIA] }
      },
      include: {
        plan: {
          include: {
            service: {
              select: { nombre: true, logoUrl: true, usaPin: true }
            }
          }
        },
        account: {
          select: {
            id: true,
            emailCuenta: true,
            passwordCuenta: true,
            perfilAsignado: true,
            pinPerfil: true,
            assignedPin: true,
          }
        },
        order: {
          select: {
            id: true,
            referenciaExterna: true,
            metodoPago: true,
            total: true,
            estado: true,
            vendedorNombre: true,
            descripcionVenta: true,
            comprobanteUrl: true,
            createdAt: true,
          }
        }
      },
      orderBy: { fechaVencimiento: 'asc' }
    });

    // Calcular días restantes y formatear respuesta
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return subscriptions.map(sub => {
      const vencimiento = new Date(sub.fechaVencimiento);
      vencimiento.setHours(0, 0, 0, 0);
      const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      const accId = sub.account?.id || sub.accountId;

      return {
        id: sub.id,
        orderId: sub.orderId,
        order: sub.order ? {
          id: sub.order.id,
          referenciaExterna: sub.order.referenciaExterna,
          metodoPago: sub.order.metodoPago,
          total: sub.order.total,
          estado: sub.order.estado,
          vendedorNombre: sub.order.vendedorNombre,
          descripcionVenta: sub.order.descripcionVenta,
          comprobanteUrl: sub.order.comprobanteUrl,
          createdAt: sub.order.createdAt,
        } : null,
        servicio: sub.plan.service.nombre,
        logoUrl: sub.plan.service.logoUrl,
        plan: sub.plan.nombrePlan,
        garantiaDias: sub.plan.garantiaDias,
        resolucion: sub.plan.resolucion,
        pantallas: sub.plan.pantallasSimultaneas,
        fechaInicio: sub.fechaInicio,
        fechaVencimiento: sub.fechaVencimiento,
        diasRestantes,
        estado: sub.estado,
        autoRenovar: sub.autoRenovar,
        emailCuenta: sub.account?.emailCuenta,
        passwordCuenta: sub.account?.passwordCuenta,
        perfilAsignado: sub.account?.perfilAsignado,
        usaPin: sub.plan.usaPin ?? sub.plan.service.usaPin ?? true,
        pinPerfil: (sub.plan.usaPin ?? sub.plan.service.usaPin ?? true)
          ? sub.account?.assignedPin || sub.account?.pinPerfil
          : null,
        assignedPin: (sub.plan.usaPin ?? sub.plan.service.usaPin ?? true)
          ? sub.account?.assignedPin || sub.account?.pinPerfil
          : null,
        // Solo mostrar credenciales si está activa
        credenciales: sub.estado === SubscriptionStatus.ACTIVA ? {
          email: sub.account?.emailCuenta,
          password: sub.account?.passwordCuenta,
          perfil: sub.account?.perfilAsignado,
          pin: (sub.plan.usaPin ?? sub.plan.service.usaPin ?? true)
            ? sub.account?.assignedPin || sub.account?.pinPerfil
            : null,
          usaPin: sub.plan.usaPin ?? sub.plan.service.usaPin ?? true,
        } : null,
      };
    });
  }

  // OBTENER UNA SUSCRIPCIÓN ESPECÍFICA (Con credenciales)
  async getSubscriptionDetails(customerId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { 
        id: subscriptionId,
        customerId // Seguridad: solo puede ver la suya
      },
      include: {
        plan: {
          include: {
            service: true
          }
        },
        account: true,
        order: true
      }
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    const hoy = new Date();
    const vencimiento = new Date(subscription.fechaVencimiento);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    const accId = subscription.account?.id || subscription.accountId;

    // ESCENARIO 1: Registrar factor de seguridad - Las credenciales han sido vistas
    if (!subscription.credencialesVistas) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          credencialesVistas: true,
          credencialesVistasAt: new Date(),
        },
      });

      if (subscription.orderId) {
        await this.prisma.order.update({
          where: { id: subscription.orderId },
          data: { credencialesVistas: true },
        }).catch(() => {});
      }
    }

      const usaPin = subscription.plan.usaPin ?? subscription.plan.service.usaPin ?? true;

      return {
        id: subscription.id,
        orderId: subscription.orderId,
        order: subscription.order ? {
          id: subscription.order.id,
          referenciaExterna: subscription.order.referenciaExterna,
          metodoPago: subscription.order.metodoPago,
          total: subscription.order.total,
          estado: subscription.order.estado,
          vendedorNombre: subscription.order.vendedorNombre,
          descripcionVenta: subscription.order.descripcionVenta,
          comprobanteUrl: subscription.order.comprobanteUrl,
          createdAt: subscription.order.createdAt,
        } : null,
        servicio: subscription.plan.service.nombre,
        logoUrl: subscription.plan.service.logoUrl,
        plan: subscription.plan.nombrePlan,
        garantiaDias: subscription.plan.garantiaDias,
        resolucion: subscription.plan.resolucion,
        pantallas: subscription.plan.pantallasSimultaneas,
        fechaInicio: subscription.fechaInicio,
        fechaVencimiento: subscription.fechaVencimiento,
        diasRestantes,
        estado: subscription.estado,
        autoRenovar: subscription.autoRenovar,
        credencialesVistas: true,
        usaPin,
        credenciales: {
          email: subscription.account.emailCuenta,
          password: subscription.account.passwordCuenta,
          perfil: subscription.account.perfilAsignado,
          pin: usaPin ? (subscription.account.assignedPin || subscription.account.pinPerfil) : null,
          usaPin,
        },
        reglasUso: [
          'No cambiar la contraseña ni el correo',
          ...(usaPin ? ['No crear ni modificar el PIN del perfil sin autorización'] : []),
          'Usar solo en el país registrado',
          'Reportar errores inmediatamente'
        ]
      };
  }

  // HISTORIAL DE COMPRAS (Órdenes de Venta)
  async getMyOrders(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            plan: {
              include: {
                service: { select: { nombre: true, logoUrl: true } }
              }
            }
          }
        },
        subscriptions: {
          include: {
            plan: {
              include: {
                service: { select: { nombre: true, logoUrl: true } }
              }
            },
            account: {
              select: {
                id: true,
                emailCuenta: true,
                passwordCuenta: true,
                perfilAsignado: true,
                pinPerfil: true,
                assignedPin: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return orders.map(order => ({
      id: order.id,
      fecha: order.createdAt,
      createdAt: order.createdAt,
      total: order.total,
      estado: order.estado,
      metodoPago: order.metodoPago,
      referenciaExterna: order.referenciaExterna,
      comprobanteUrl: order.comprobanteUrl,
      vendedorNombre: order.vendedorNombre,
      vendedorPorcentaje: order.vendedorPorcentaje,
      vendedorComision: order.vendedorComision,
      descripcionVenta: order.descripcionVenta,
      motivoCancelacion: order.estado === 'CANCELADO' ? extractMotivoCancelacion(order.descripcionVenta) : null,
      items: order.items.map(item => ({
        id: item.id,
        servicio: item.plan.service.nombre,
        logoUrl: item.plan.service.logoUrl,
        plan: item.plan.nombrePlan,
        duracionDias: item.plan.duracionDias,
        resolucion: item.plan.resolucion,
        pantallas: item.plan.pantallasSimultaneas,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      })),
      subscriptions: order.subscriptions.map(sub => {
        const hoy = new Date();
        const vencimiento = new Date(sub.fechaVencimiento);
        const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        const accId = sub.account?.id || sub.accountId;
        return {
          id: sub.id,
          servicio: sub.plan.service.nombre,
          logoUrl: sub.plan.service.logoUrl,
          plan: sub.plan.nombrePlan,
          estado: sub.estado,
          fechaInicio: sub.fechaInicio,
          fechaVencimiento: sub.fechaVencimiento,
          diasRestantes,
          emailCuenta: sub.account?.emailCuenta,
          passwordCuenta: order.estado === 'PAGADO' ? sub.account?.passwordCuenta : null,
          perfilAsignado: sub.account?.perfilAsignado,
          pinPerfil: order.estado === 'PAGADO' ? (sub.account?.assignedPin || sub.account?.pinPerfil) : null,
          assignedPin: order.estado === 'PAGADO' ? (sub.account?.assignedPin || sub.account?.pinPerfil) : null,
        };
      })
    }));
  }

  // OBTENER DETALLE COMPLETO DE UNA ORDEN ESPECÍFICA
  async getOrderDetails(customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        items: {
          include: {
            plan: {
              include: {
                service: { select: { nombre: true, logoUrl: true } }
              }
            }
          }
        },
        subscriptions: {
          include: {
            plan: {
              include: {
                service: { select: { nombre: true, logoUrl: true } }
              }
            },
            account: {
              select: {
                id: true,
                emailCuenta: true,
                passwordCuenta: true,
                perfilAsignado: true,
                pinPerfil: true,
                assignedPin: true,
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (order.estado === 'PAGADO' && order.subscriptions?.length > 0 && !order.credencialesVistas) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { credencialesVistas: true },
      }).catch(() => {});
      for (const s of order.subscriptions) {
        if (!s.credencialesVistas) {
          await this.prisma.subscription.update({
            where: { id: s.id },
            data: { credencialesVistas: true, credencialesVistasAt: new Date() },
          }).catch(() => {});
        }
      }
    }

    return {
      id: order.id,
      fecha: order.createdAt,
      createdAt: order.createdAt,
      total: order.total,
      estado: order.estado,
      metodoPago: order.metodoPago,
      referenciaExterna: order.referenciaExterna,
      comprobanteUrl: order.comprobanteUrl,
      vendedorNombre: order.vendedorNombre,
      vendedorPorcentaje: order.vendedorPorcentaje,
      vendedorComision: order.vendedorComision,
      descripcionVenta: order.descripcionVenta,
      motivoCancelacion: order.estado === 'CANCELADO' ? extractMotivoCancelacion(order.descripcionVenta) : null,
      items: order.items.map(item => ({
        id: item.id,
        servicio: item.plan.service.nombre,
        logoUrl: item.plan.service.logoUrl,
        plan: item.plan.nombrePlan,
        duracionDias: item.plan.duracionDias,
        resolucion: item.plan.resolucion,
        pantallas: item.plan.pantallasSimultaneas,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      })),
      subscriptions: order.subscriptions.map(sub => {
        const hoy = new Date();
        const vencimiento = new Date(sub.fechaVencimiento);
        const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        const accId = sub.account?.id || sub.accountId;
        return {
          id: sub.id,
          servicio: sub.plan.service.nombre,
          logoUrl: sub.plan.service.logoUrl,
          plan: sub.plan.nombrePlan,
          estado: sub.estado,
          fechaInicio: sub.fechaInicio,
          fechaVencimiento: sub.fechaVencimiento,
          diasRestantes,
          emailCuenta: sub.account?.emailCuenta,
          passwordCuenta: sub.account?.passwordCuenta,
          perfilAsignado: sub.account?.perfilAsignado,
          pinPerfil: sub.account?.assignedPin || sub.account?.pinPerfil,
          assignedPin: sub.account?.assignedPin || sub.account?.pinPerfil,
        };
      })
    };
  }

  // SOLICITAR GARANTÍA
  async requestWarranty(customerId: string, dto: RequestWarrantyDto) {
    // 1. Validar que la suscripción pertenece al cliente
const subscription = await this.prisma.subscription.findFirst({
  where: { 
    id: dto.subscriptionId,
    customerId 
  },
  include: { 
    account: true,
    plan: true  // ← AÑADIR ESTA LÍNEA
  }
});

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    // 2. Validar que está dentro del período de garantía
    const hoy = new Date();
    const fechaCompra = subscription.fechaInicio;
    const diasDesdeCompra = Math.floor((hoy.getTime() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasDesdeCompra > subscription.plan.garantiaDias) {
      throw new BadRequestException(`El período de garantía de ${subscription.plan.garantiaDias} días ha expirado`);
    }

    // 3. Validar que no haya un ticket abierto para esta suscripción
    const ticketExistente = await this.prisma.supportTicket.findFirst({
      where: {
        subscriptionId: dto.subscriptionId,
        estado: { in: ['pendiente_revision', 'aprobado_reemplazo'] }
      }
    });

    if (ticketExistente) {
      throw new BadRequestException('Ya existe un ticket abierto para esta suscripción');
    }

    const motivoConDetalle = dto.descripcionAdicional?.trim()
      ? `${dto.motivoReporte} | ${dto.descripcionAdicional.trim()}`
      : dto.motivoReporte;

    // Verificación de coincidencia de contraseña reportada (SRS SGVS RF-020, RF-021)
    const claveAlMomento = subscription.account?.passwordCuenta || null;
    let coincideClave: boolean | null = null;
    if (dto.claveReportada && claveAlMomento) {
      coincideClave = dto.claveReportada.trim() === claveAlMomento.trim();
    }

    // 4. Crear ticket de soporte con trazabilidad SGVS
    const ticket = await this.prisma.supportTicket.create({
      data: {
        subscriptionId: dto.subscriptionId,
        customerId: customerId,
        motivoReporte: motivoConDetalle,
        tipoError: dto.tipoError || dto.motivoReporte,
        claveReportada: dto.claveReportada || null,
        claveAlMomento: claveAlMomento,
        coincideClave: coincideClave,
        providerId: subscription.account?.providerId || null,
        evidenciaUrl: dto.evidenciaUrl,
        estado: 'pendiente_revision',
      },
      include: {
        subscription: {
          include: {
            plan: { include: { service: true } },
            customer: { include: { user: true } }
          }
        }
      }
    });

    // 5. Marcar suscripción como en garantía
    await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: { estado: SubscriptionStatus.EN_GARANTIA }
    });

    return {
      message: 'Ticket de garantía creado exitosamente',
      ticketId: ticket.id,
      coincideClave,
      mensajeCliente: coincideClave === false
        ? `Hemos recibido tu reporte. Nota: La clave reportada difiere de la clave original entregada. Nuestro equipo validará el caso en los próximos minutos.`
        : `Hemos recibido tu reporte. Nuestro equipo lo validará en los próximos 10 minutos. Te enviaremos la nueva cuenta por WhatsApp.`,
      estadoTicket: ticket.estado
    };
  }

  // VER MIS TICKETS DE GARANTÍA
  async getMyTickets(customerId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { customerId },
      include: {
        subscription: {
          include: {
            plan: {
              include: {
                service: { select: { nombre: true } }
              }
            },
            account: {
              select: {
                id: true,
                emailCuenta: true,
                perfilAsignado: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return tickets.map(ticket => {
      const accId = ticket.subscription?.account?.id || ticket.subscription?.accountId;
      return {
        id: ticket.id,
        servicio: ticket.subscription.plan.service.nombre,
        plan: ticket.subscription.plan.nombrePlan,
        orderId: ticket.subscription?.orderId,
        accountEmail: ticket.subscription?.account?.emailCuenta,
        perfilAsignado: ticket.subscription?.account?.perfilAsignado,
        motivo: ticket.motivoReporte,
        estado: ticket.estado,
        fechaCreacion: ticket.createdAt,
        fechaResolucion: ticket.resolvedAt,
      };
    });
  }

  // RENOVACIÓN RÁPIDA (Crear orden basada en suscripción existente)
  async renewSubscription(customerId: string, dto: RenewSubscriptionDto) {
    // 1. Buscar la suscripción
    const subscription = await this.prisma.subscription.findFirst({
      where: { 
        id: dto.subscriptionId,
        customerId 
      },
      include: {
        account: true,
        plan: { include: { service: true } },
      }
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    // 2. Crear orden de renovación
    const accCode = subscription.accountId ? `#ACC-${subscription.accountId.substring(0, 8).toUpperCase()}` : 'N/A';
    const descripcionVenta = `[RENOVACIÓN] Suscripción ID: ${subscription.id} | Cuenta: ${accCode} (${subscription.account?.emailCuenta || 'N/A'}) | Servicio: ${subscription.plan?.service?.nombre || 'Streaming'} - ${subscription.plan?.nombrePlan}`;

    const orderDto = {
      customerId,
      items: [
        {
          planId: subscription.planId,
          cantidad: 1
        }
      ],
      metodoPago: dto.metodoPago,
      comprobanteUrl: dto.comprobanteUrl,
      descripcionVenta,
    };

    const result = await this.ordersService.createOrder(orderDto);

    return {
      message: 'Orden de renovación creada exitosamente. Permanecerá en estado PENDIENTE hasta su validación.',
      orderId: result.order.id,
      total: result.order.total,
      siguientePaso: 'Tu solicitud de renovación ha sido recibida y será verificada por el administrador.'
    };
  }

  // ACTUALIZAR PERFIL DEL CLIENTE
  async updateProfile(customerId: string, data: { nombre?: string; whatsapp?: string; pais?: string }) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { user: true }
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Actualizar usuario y cliente en transacción
    const updated = await this.prisma.$transaction(async (tx) => {
      if (data.nombre) {
        await tx.user.update({
          where: { id: customer.userId },
          data: { nombre: data.nombre }
        });
      }

      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          ...(data.whatsapp && { whatsapp: data.whatsapp }),
          ...(data.pais && { pais: data.pais })
        },
        include: { user: true }
      });

      return updatedCustomer;
    });

    return {
      message: 'Perfil actualizado',
      user: {
        nombre: updated.user.nombre,
        email: updated.user.email,
        whatsapp: updated.whatsapp,
        pais: updated.pais
      }
    };
  }

  // OBTENER RESUMEN DEL CLIENTE (Para el header del portal)
  async getCustomerSummary(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { user: true }
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const suscripcionesActivas = await this.prisma.subscription.count({
      where: { 
        customerId,
        estado: SubscriptionStatus.ACTIVA
      }
    });

    const porVencer = await this.prisma.subscription.count({
      where: {
        customerId,
        estado: SubscriptionStatus.ACTIVA,
        fechaVencimiento: {
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Próximos 3 días
        }
      }
    });

    return {
      customerId: customer.id,
      nombre: customer.user.nombre,
      email: customer.user.email,
      whatsapp: customer.whatsapp,
      pais: customer.pais,
      walletBalance: Number(customer.walletBalance || 0),
      strikes: customer.strikes || 0,
      estadoUsuario: customer.estadoUsuario || 'ACTIVO',
      suscripcionesActivas,
      porVencer,
      miembroDesde: customer.createdAt,
    };
  }

  // =========================================================================
  // ESCENARIO 1: MARCAR CREDENCIALES COMO VISTAS EXPLÍCITAMENTE
  // =========================================================================
  async markCredentialsViewed(customerId: string, subscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, customerId },
    });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        credencialesVistas: true,
        credencialesVistasAt: new Date(),
      },
    });

    if (sub.orderId) {
      await this.prisma.order.update({
        where: { id: sub.orderId },
        data: { credencialesVistas: true },
      }).catch(() => {});
    }

    return { success: true, credencialesVistas: true };
  }

  // =========================================================================
  // ESCENARIO 7: SOLICITAR CÓDIGO DE HOGAR / IP TEMPORAL (IMAP + REGEX)
  // =========================================================================
  async requestHouseholdCode(customerId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, customerId },
      include: {
        account: {
          include: { rootAccount: true },
        },
        plan: { include: { service: true } },
      },
    });

    if (!subscription) throw new NotFoundException('Suscripción no encontrada');
    if (subscription.estado !== SubscriptionStatus.ACTIVA) {
      throw new BadRequestException('Solo puedes solicitar códigos para suscripciones activas');
    }

    const root = subscription.account.rootAccount;
    const serviceName = subscription.plan.service.nombre;

    // Escanear bandeja vía IMAP
    const codeResult = await this.imapService.extractLatestHouseholdCode({
      host: root?.imapHost,
      port: root?.imapPort,
      user: root?.imapUser || root?.email || subscription.account.emailCuenta,
      password: root?.imapPassword,
      secure: root?.imapSecure,
      serviceName,
    });

    return {
      success: true,
      servicio: serviceName,
      codigo: codeResult.codigo,
      asunto: codeResult.asunto,
      remitente: codeResult.remitente,
      fechaCorreo: codeResult.fecha,
      mensaje: `Código de confirmación de hogar para ${serviceName} obtenido con éxito. Ingresa este código en tu dispositivo.`,
    };
  }

  // =========================================================================
  // ESCENARIO 3: REPORTAR PANTALLA OCUPADA (INTRUSIÓN DE PERFIL)
  // =========================================================================
  async reportOccupiedScreen(customerId: string, subscriptionId: string, motivo?: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, customerId },
      include: {
        account: { include: { rootAccount: true } },
        plan: { include: { service: true } },
        customer: { include: { user: true } },
      },
    });

    if (!subscription) throw new NotFoundException('Suscripción no encontrada');

    const root = subscription.account.rootAccount;

    // 1. Crear registro de infracción/reporte
    const infraction = await this.prisma.profileInfraction.create({
      data: {
        customerId,
        reportadoPorCustomerId: customerId,
        accountId: subscription.accountId,
        rootAccountId: root?.id || null,
        tipo: 'PANTALLA_OCUPADA',
        descripcion: motivo || 'Cliente reporta que su pantalla asignada está ocupada por otro usuario no autorizado.',
        strikesAplicados: 1,
        estado: 'PENDIENTE',
      },
    });

    // 2. Marcar cuenta raíz en auditoría si existe
    if (root) {
      await this.prisma.rootAccount.update({
        where: { id: root.id },
        data: { estado: RootAccountStatus.EN_AUDITORIA },
      });
    }

    // 3. Crear ticket de soporte para el equipo de administración
    await this.prisma.supportTicket.create({
      data: {
        subscriptionId,
        customerId,
        motivoReporte: 'pantalla_ocupada',
        estado: 'pendiente_revision',
        evidenciaUrl: `[REPORTE_PANTALLA_OCUPADA] InfractionId: ${infraction.id} | Cuenta: ${subscription.account.emailCuenta} | Perfil: ${subscription.account.perfilAsignado || 'N/A'}`,
      },
    });

    return {
      success: true,
      message: 'Reporte de pantalla ocupada recibido. Nuestro equipo técnico auditará la cuenta raíz y cambiará las credenciales para restituir tu acceso.',
      infractionId: infraction.id,
    };
  }

  // =========================================================================
  // ESCENARIO 13: GESTIÓN DE PIN EXCLUSIVA Y REPORTE DE SECUESTRO DE PIN
  // =========================================================================
  async setProfilePin(customerId: string, subscriptionId: string, pin: string) {
    if (!pin || !/^\d{4}$/.test(pin.trim())) {
      throw new BadRequestException('El PIN de perfil debe constar de exactamente 4 dígitos numéricos');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, customerId },
      include: { account: true },
    });

    if (!subscription) throw new NotFoundException('Suscripción no encontrada');

    const cleanPin = pin.trim();

    await this.prisma.account.update({
      where: { id: subscription.accountId },
      data: {
        assignedPin: cleanPin,
        pinPerfil: cleanPin,
      },
    });

    return {
      success: true,
      message: 'PIN de perfil configurado exitosamente.',
      pin: cleanPin,
    };
  }

  async reportPinHijack(customerId: string, subscriptionId: string, descripcion?: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, customerId },
      include: {
        account: { include: { rootAccount: true } },
        customer: { include: { user: true } },
      },
    });

    if (!subscription) throw new NotFoundException('Suscripción no encontrada');

    const infraction = await this.prisma.profileInfraction.create({
      data: {
        customerId,
        reportadoPorCustomerId: customerId,
        accountId: subscription.accountId,
        rootAccountId: subscription.account.rootAccountId,
        tipo: 'SECUESTRO_PIN',
        descripcion: descripcion || 'Cliente reporta alteración o bloqueo de PIN en su perfil asignado.',
        strikesAplicados: 1,
        estado: 'PENDIENTE',
      },
    });

    // Abrir ticket de soporte
    await this.prisma.supportTicket.create({
      data: {
        subscriptionId,
        customerId,
        motivoReporte: 'secuestro_pin',
        estado: 'pendiente_revision',
        evidenciaUrl: `[SECUESTRO_PIN] PIN registrado en BD: ${subscription.account.assignedPin || 'Sin PIN'}. InfractionId: ${infraction.id}`,
      },
    });

    return {
      success: true,
      message: 'Reporte de secuestro o alteración de PIN recibido. Se ha abierto una infracción para auditar a los usuarios de la cuenta.',
      assignedPinEnSistema: subscription.account.assignedPin || subscription.account.pinPerfil || 'No asignado',
    };
  }
}