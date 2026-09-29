import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { RequestWarrantyDto } from './dto/request-warranty.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { SubscriptionStatus, OrderStatus, AccountStatus } from '@prisma/client';

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
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
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
              select: { nombre: true, logoUrl: true }
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
        // Solo mostrar credenciales si está activa
        credenciales: sub.estado === SubscriptionStatus.ACTIVA ? {
          email: sub.account.emailCuenta,
          password: sub.account.passwordCuenta,
          perfil: sub.account.perfilAsignado,
          pin: sub.account.pinPerfil,
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
      credenciales: {
        email: subscription.account.emailCuenta,
        password: subscription.account.passwordCuenta,
        perfil: subscription.account.perfilAsignado,
        pin: subscription.account.pinPerfil,
      },
      reglasUso: [
        'No cambiar la contraseña ni el correo',
        'No crear ni modificar el PIN del perfil',
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
                perfilAsignado: true,
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
          perfilAsignado: sub.account?.perfilAsignado,
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
                perfilAsignado: true,
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException('Orden de compra no encontrada');
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
          perfilAsignado: sub.account?.perfilAsignado,
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

    // 4. Crear ticket de soporte
    const ticket = await this.prisma.supportTicket.create({
      data: {
        subscriptionId: dto.subscriptionId,
        customerId: customerId,
        motivoReporte: motivoConDetalle,
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
      mensajeCliente: `Hemos recibido tu reporte. Nuestro equipo lo validará en los próximos 10 minutos. Te enviaremos la nueva cuenta por WhatsApp.`,
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
      suscripcionesActivas,
      porVencer,
      miembroDesde: customer.createdAt,
    };
  }
}