import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { AccountStatus, SubscriptionStatus, AuditCategory, AuditSeverity } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WarrantyService {
  private readonly logger = new Logger(WarrantyService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsappService,
    private auditService: AuditService,
  ) {}

  // ============================================
  // LISTAR TICKETS
  // ============================================

  // OBTENER TODOS LOS TICKETS (Con filtros)
  async getAllTickets(filters: {
    estado?: string;
    customerId?: string;
    motivoReporte?: string;
  }) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.customerId && { customerId: filters.customerId }),
        ...(filters.motivoReporte && { motivoReporte: filters.motivoReporte }),
      },
      include: {
        customer: {
          include: {
            user: { select: { nombre: true, email: true, phone: true } },
          },
        },
        subscription: {
          include: {
            plan: {
              include: {
                service: { select: { nombre: true, logoUrl: true } },
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
                batchId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Los más antiguos primero (prioridad)
    });

    // Calcular stock disponible por plan
    const planIds = Array.from(new Set(tickets.map((t) => t.subscription.planId)));
    const stockCounts =
      planIds.length > 0
        ? await this.prisma.account.groupBy({
            by: ['planId'],
            where: {
              planId: { in: planIds },
              estado: AccountStatus.DISPONIBLE,
            },
            _count: true,
          })
        : [];
    const stockMap = new Map<string, number>(
      stockCounts.map((s) => [s.planId, s._count]),
    );

    // Enriquecer con tiempo en cola
    const ahora = new Date();
    return tickets.map((ticket) => {
      const telefonoCliente = ticket.customer.whatsapp || ticket.customer.user.phone || 'Sin registrar';
      return {
        id: ticket.id,
        cliente: {
          nombre: ticket.customer.user.nombre,
          email: ticket.customer.user.email,
          whatsapp: ticket.customer.whatsapp,
          phone: ticket.customer.user.phone || ticket.customer.whatsapp,
          telefono: telefonoCliente,
        },
        customer: {
          id: ticket.customer.id,
          whatsapp: ticket.customer.whatsapp,
          user: {
            nombre: ticket.customer.user.nombre,
            email: ticket.customer.user.email,
            phone: ticket.customer.user.phone || ticket.customer.whatsapp,
          },
        },
        servicio: ticket.subscription.plan.service.nombre,
        logoUrl: ticket.subscription.plan.service.logoUrl,
        plan: ticket.subscription.plan.nombrePlan,
        planId: ticket.subscription.planId,
        stockDisponible: stockMap.get(ticket.subscription.planId) || 0,
        subscription: {
          id: ticket.subscription.id,
          planId: ticket.subscription.planId,
          plan: {
            service: {
              nombre: ticket.subscription.plan.service.nombre,
              logoUrl: ticket.subscription.plan.service.logoUrl,
            },
            nombrePlan: ticket.subscription.plan.nombrePlan,
          },
          account: ticket.subscription.account,
        },
        cuentaActual: {
          email: ticket.subscription.account?.emailCuenta || 'N/A',
          perfil: ticket.subscription.account?.perfilAsignado || 'N/A',
          batchId: ticket.subscription.account?.batchId || null,
        },
        motivo: ticket.motivoReporte,
        motivoReporte: ticket.motivoReporte,
        tipoError: ticket.tipoError,
        claveReportada: ticket.claveReportada,
        claveAlMomento: ticket.claveAlMomento,
        coincideClave: ticket.coincideClave,
        claveNuevaEntregada: ticket.claveNuevaEntregada,
        notificadoAlCliente: ticket.notificadoAlCliente,
        evidenciaUrl: ticket.evidenciaUrl,
        estado: ticket.estado,
        tiempoEnCola: this.calcularTiempoEnCola(ticket.createdAt, ahora),
        fechaCreacion: ticket.createdAt,
        createdAt: ticket.createdAt,
        fechaResolucion: ticket.resolvedAt,
        resueltoPor: ticket.resueltoPor,
      };
    });
  }

  // OBTENER TICKETS PENDIENTES (Vista rápida del admin)
  async getPendingTickets() {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        estado: { in: ['pendiente_revision', 'pendiente_stock'] },
      },
      include: {
        customer: {
          include: {
            user: { select: { nombre: true, email: true, phone: true } },
          },
        },
        subscription: {
          include: {
            plan: {
              include: {
                service: { select: { nombre: true, logoUrl: true } },
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
                batchId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const planIds = Array.from(new Set(tickets.map((t) => t.subscription.planId)));
    const stockCounts =
      planIds.length > 0
        ? await this.prisma.account.groupBy({
            by: ['planId'],
            where: {
              planId: { in: planIds },
              estado: AccountStatus.DISPONIBLE,
            },
            _count: true,
          })
        : [];
    const stockMap = new Map<string, number>(
      stockCounts.map((s) => [s.planId, s._count]),
    );

    const ahora = new Date();
    return tickets.map((ticket) => ({
      id: ticket.id,
      cliente: {
        nombre: ticket.customer.user.nombre,
        email: ticket.customer.user.email,
        whatsapp: ticket.customer.whatsapp,
        phone: ticket.customer.user.phone || ticket.customer.whatsapp,
        telefono: ticket.customer.whatsapp || ticket.customer.user.phone || 'Sin registrar',
      },
      customer: {
        id: ticket.customer.id,
        whatsapp: ticket.customer.whatsapp,
        user: {
          nombre: ticket.customer.user.nombre,
          email: ticket.customer.user.email,
          phone: ticket.customer.user.phone || ticket.customer.whatsapp,
        },
      },
      servicio: ticket.subscription.plan.service.nombre,
      logoUrl: ticket.subscription.plan.service.logoUrl,
      plan: ticket.subscription.plan.nombrePlan,
      planId: ticket.subscription.planId,
      stockDisponible: stockMap.get(ticket.subscription.planId) || 0,
      subscription: {
        id: ticket.subscription.id,
        planId: ticket.subscription.planId,
        plan: {
          service: {
            nombre: ticket.subscription.plan.service.nombre,
            logoUrl: ticket.subscription.plan.service.logoUrl,
          },
          nombrePlan: ticket.subscription.plan.nombrePlan,
        },
        account: ticket.subscription.account,
      },
      cuentaActual: {
        id: ticket.subscription.account?.id || null,
        codigo: ticket.subscription.account?.id ? `#ACC-${ticket.subscription.account.id.substring(0, 8).toUpperCase()}` : null,
        email: ticket.subscription.account?.emailCuenta || 'N/A',
        perfil: ticket.subscription.account?.perfilAsignado || 'N/A',
        batchId: ticket.subscription.account?.batchId || null,
      },
      motivo: ticket.motivoReporte,
      motivoReporte: ticket.motivoReporte,
      tipoError: ticket.tipoError,
      claveReportada: ticket.claveReportada,
      claveAlMomento: ticket.claveAlMomento,
      coincideClave: ticket.coincideClave,
      claveNuevaEntregada: ticket.claveNuevaEntregada,
      notificadoAlCliente: ticket.notificadoAlCliente,
      evidenciaUrl: ticket.evidenciaUrl,
      estado: ticket.estado,
      tiempoEnCola: this.calcularTiempoEnCola(ticket.createdAt, ahora),
      fechaCreacion: ticket.createdAt,
      createdAt: ticket.createdAt,
      fechaResolucion: ticket.resolvedAt,
      resueltoPor: ticket.resueltoPor,
    }));
  }

  // OBTENER ESTADÍSTICAS DE TICKETS
  async getTicketStats() {
    const pendientes = await this.prisma.supportTicket.count({
      where: { estado: 'pendiente_revision' },
    });

    const pendientesStock = await this.prisma.supportTicket.count({
      where: { estado: 'pendiente_stock' },
    });

    const aprobados = await this.prisma.supportTicket.count({
      where: { estado: 'aprobado_reemplazo' },
    });

    const rechazados = await this.prisma.supportTicket.count({
      where: { estado: 'rechazado' },
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const creadosHoy = await this.prisma.supportTicket.count({
      where: { createdAt: { gte: hoy } },
    });

    const resueltosHoy = await this.prisma.supportTicket.count({
      where: { resolvedAt: { gte: hoy } },
    });

    // Tiempo promedio de resolución (en minutos)
    const ticketsResueltos = await this.prisma.supportTicket.findMany({
      where: { resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 100, // Últimos 100 para el promedio
    });

    const tiempoPromedio =
      ticketsResueltos.length > 0
        ? ticketsResueltos.reduce((sum, t) => {
            const diff =
              t.resolvedAt!.getTime() - t.createdAt.getTime();
            return sum + diff / (1000 * 60); // En minutos
          }, 0) / ticketsResueltos.length
        : 0;

    // Desglose por motivo
    const motivos = await this.prisma.supportTicket.groupBy({
      by: ['motivoReporte'],
      _count: true,
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    return {
      pendientes,
      aprobados,
      rechazados,
      creadosHoy,
      resueltosHoy,
      tiempoPromedioResolucion: Math.round(tiempoPromedio),
      motivos: motivos.map((m) => ({
        motivo: m.motivoReporte,
        cantidad: m._count,
      })),
    };
  }

  // ============================================
  // RESOLVER TICKET (Aprobar o Rechazar)
  // ============================================

  async resolveTicket(adminId: string, dto: ResolveTicketDto) {
    // 1. Buscar el ticket
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: dto.ticketId },
      include: {
        subscription: {
          include: {
            plan: { include: { service: true } },
            account: true,
            customer: { include: { user: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    if (ticket.estado !== 'pendiente_revision') {
      throw new BadRequestException('Este ticket ya fue resuelto');
    }

    if (dto.decision === 'rechazado') {
      return this.rejectTicket(ticket, adminId, dto.motivoRechazo);
    }

    if (dto.decision === 'aprobado_reemplazo') {
      return this.approveAndReplace(ticket, adminId);
    }
  }

  // APROBAR Y REEMPLAZAR (O PONER EN COLA AUTOMÁTICA SI NO HAY STOCK)
  private async approveAndReplace(ticket: any, adminId: string) {
    const subscription = ticket.subscription;

    // Transacción: Todo o nada
    const resultado = await this.prisma.$transaction(async (tx) => {
      // 1. Marcar cuenta antigua como defectuosa
      await tx.account.update({
        where: { id: subscription.account.id },
        data: { estado: AccountStatus.DEFECTUOSA },
      });

      // 2. Buscar cuenta nueva disponible del MISMO plan
      const nuevaCuenta = await tx.account.findFirst({
        where: {
          planId: subscription.planId,
          estado: AccountStatus.DISPONIBLE,
        },
        orderBy: { createdAt: 'asc' }, // FIFO
      });

      if (!nuevaCuenta) {
        // NO HAY STOCK:
        // Se aprueba la garantía pero queda en cola prioritaria "pendiente_stock"
        await tx.supportTicket.update({
          where: { id: ticket.id },
          data: {
            estado: 'pendiente_stock',
            resueltoPor: adminId,
          },
        });

        // Suspender suscripción temporalmente mientras llega la nueva cuenta
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { estado: SubscriptionStatus.SUSPENDIDA },
        });

        return {
          exito: true,
          pendienteStock: true,
          mensaje: `Garantía aprobada. Actualmente no hay stock de ${subscription.plan.service.nombre} (${subscription.plan.nombrePlan}). El ticket ha quedado en cola prioritaria y se le asignará la cuenta automáticamente tan pronto ingrese nuevo inventario.`,
        };
      }

      // SI HAY STOCK DISPONIBLE:
      // 3. Marcar ticket como resuelto y reemplazado con trazabilidad SGVS
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          estado: 'aprobado_reemplazo',
          resueltoPor: adminId,
          resolvedAt: new Date(),
          claveNuevaEntregada: nuevaCuenta.passwordCuenta,
          notificadoAlCliente: true,
        },
      });

      // 4. Asignar nueva cuenta a la suscripción y descongelar días pendientes si existían
      const now = new Date();
      let nuevaFechaVencimiento = subscription.fechaVencimiento;
      if (subscription.diasPendientes && subscription.diasPendientes > 0) {
        nuevaFechaVencimiento = new Date(now.getTime() + subscription.diasPendientes * 24 * 60 * 60 * 1000);
      }

      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          accountId: nuevaCuenta.id,
          estado: SubscriptionStatus.ACTIVA,
          clase: 'GARANTIA',
          fechaUltimoCambioClave: now,
          estadoLibre: 'VENDIDA',
          fechaVencimiento: nuevaFechaVencimiento,
          diasPendientes: 0,
          congeladoAt: null,
        },
      });

      // 5. Marcar nueva cuenta como ocupada
      await tx.account.update({
        where: { id: nuevaCuenta.id },
        data: { estado: AccountStatus.OCUPADA },
      });

      // 6. Actualizar tasa de fallo del lote (si aplica)
      if (subscription.account.batchId) {
        await this.actualizarTasaFallo(tx, subscription.account.batchId);
      }

      return {
        exito: true,
        pendienteStock: false,
        nuevaCuenta: {
          id: nuevaCuenta.id,
          codigo: `#ACC-${nuevaCuenta.id.substring(0, 8).toUpperCase()}`,
          email: nuevaCuenta.emailCuenta,
          password: nuevaCuenta.passwordCuenta,
          perfil: nuevaCuenta.perfilAsignado,
          pin: nuevaCuenta.pinPerfil,
        },
        subscriptionId: subscription.id,
      };
    });

    // Notificaciones por WhatsApp
    const phone = subscription.customer.whatsapp || subscription.customer.user.phone;
    if (resultado.exito && !resultado.pendienteStock) {
      try {
        await this.whatsappService.sendWarrantyReplacementMessage(
          phone,
          subscription.customer.user.nombre,
          {
            plan: subscription.plan,
            account: resultado.nuevaCuenta,
          },
        );
      } catch (error: any) {
        this.logger.error(
          `Error enviando WhatsApp de reemplazo: ${error.message}`,
        );
      }
    } else if (resultado.pendienteStock) {
      // Notificar al cliente que su garantía fue APROBADA y está en cola de auto-asignación
      try {
        await this.whatsappService.sendTextMessage(
          phone,
          `Hola ${subscription.customer.user.nombre} 👋, tu solicitud de garantía para *${subscription.plan.service.nombre}* ha sido *APROBADA* ✅.\n\nActualmente nuestro equipo está ingresando nuevo inventario de este servicio. Tu cuenta está en *cola prioritaria* y nuestro sistema automatizado te asignará y enviará tus nuevos datos de acceso directamente por aquí tan pronto esté disponible. ¡Gracias por tu paciencia! 🙏`,
        );
      } catch (error: any) {
        this.logger.error(`Error notificando aprobación pendiente de stock: ${error.message}`);
      }
    }

    // AUDITORÍA DEL SISTEMA
    await this.auditService.registrarEvento({
      usuarioId: adminId,
      modulo: AuditCategory.GARANTIAS,
      accion: resultado.pendienteStock ? 'GARANTIA_EN_COLA_STOCK' : 'GARANTIA_REEMPLAZADA',
      severidad: resultado.pendienteStock ? AuditSeverity.WARNING : AuditSeverity.SUCCESS,
      descripcion: resultado.pendienteStock
        ? `Garantía aprobada en espera de stock para ticket #${ticket.id.slice(-6).toUpperCase()} (${subscription.plan?.service?.nombre || 'Servicio'}). Cliente en cola prioritaria.`
        : `Garantía aprobada y cuenta reemplazada para ticket #${ticket.id.slice(-6).toUpperCase()} (${subscription.plan?.service?.nombre || 'Servicio'} - ${subscription.plan?.nombrePlan || ''}). Cliente: ${subscription.customer?.user?.nombre}. Cuenta anterior: ${subscription.account?.emailCuenta}, Nueva cuenta: ${resultado.nuevaCuenta?.email}`,
      entidad: 'SupportTicket',
      entidadId: ticket.id,
      detalles: {
        ticketId: ticket.id,
        cliente: subscription.customer?.user?.nombre,
        servicio: subscription.plan?.service?.nombre,
        plan: subscription.plan?.nombrePlan,
        cuentaAnterior: subscription.account?.emailCuenta,
        cuentaAnteriorId: subscription.account?.id,
        cuentaNueva: resultado.nuevaCuenta?.email,
        cuentaNuevaId: resultado.nuevaCuenta?.id,
        pendienteStock: resultado.pendienteStock,
      },
      exito: true,
    });

    return {
      message: resultado.pendienteStock
        ? resultado.mensaje
        : 'Ticket aprobado y cuenta reemplazada exitosamente',
      resultado,
    };
  }

  // ============================================
  // AUTO-ASIGNACIÓN AUTOMÁTICA AL INGRESAR INVENTARIO
  // ============================================

  /**
   * Se ejecuta automáticamente cuando se crea o importa una cuenta en estado DISPONIBLE.
   * Busca clientes que tengan garantías aprobadas en espera de stock para ese mismo plan
   * y les asigna la cuenta inmediatamente según orden de antigüedad (FIFO).
   */
  async processPendingWarrantiesForPlan(planId: string) {
    try {
      // 1. Buscar tickets con estado 'pendiente_stock' para este plan ordenados por createdAt ASC (FIFO)
      const pendingTickets = await this.prisma.supportTicket.findMany({
        where: {
          estado: 'pendiente_stock',
          subscription: {
            planId: planId,
          },
        },
        include: {
          subscription: {
            include: {
              plan: { include: { service: true } },
              customer: { include: { user: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' }, // Prioridad al cliente que más tiempo lleva esperando
      });

      if (pendingTickets.length === 0) return { asignados: 0 };

      let asignados = 0;

      for (const ticket of pendingTickets) {
        // 2. Buscar una cuenta disponible para este plan
        const cuentaDisponible = await this.prisma.account.findFirst({
          where: {
            planId: planId,
            estado: AccountStatus.DISPONIBLE,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (!cuentaDisponible) {
          // Ya no hay más cuentas disponibles en este ingreso
          break;
        }

        const subscription = ticket.subscription;

        // 3. Transacción atómica de asignación
        await this.prisma.$transaction(async (tx) => {
          // Marcar cuenta como ocupada
          await tx.account.update({
            where: { id: cuentaDisponible.id },
            data: { estado: AccountStatus.OCUPADA },
          });

          // Asignar cuenta a la suscripción del cliente y reactivarla
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              accountId: cuentaDisponible.id,
              estado: SubscriptionStatus.ACTIVA,
            },
          });

          // Marcar ticket como completamente resuelto
          await tx.supportTicket.update({
            where: { id: ticket.id },
            data: {
              estado: 'aprobado_reemplazo',
              resolvedAt: new Date(),
            },
          });
        });

        asignados++;
        this.logger.log(
          `[AUTO-ASIGNACIÓN GARANTÍA] Cuenta ${cuentaDisponible.emailCuenta} asignada automáticamente a la garantía ${ticket.id} del cliente ${subscription.customer.user.nombre}`,
        );

        // 4. Enviar datos de acceso automáticamente por WhatsApp al cliente
        try {
          const phone = subscription.customer.whatsapp || subscription.customer.user.phone;
          await this.whatsappService.sendWarrantyReplacementMessage(
            phone,
            subscription.customer.user.nombre,
            {
              plan: subscription.plan,
              account: {
                email: cuentaDisponible.emailCuenta,
                password: cuentaDisponible.passwordCuenta,
                perfil: cuentaDisponible.perfilAsignado,
                pin: cuentaDisponible.pinPerfil,
              },
            },
          );
        } catch (err: any) {
          this.logger.error(`Error enviando WhatsApp de auto-reemplazo: ${err.message}`);
        }
      }

      return { asignados };
    } catch (err: any) {
      this.logger.error(`Error en processPendingWarrantiesForPlan: ${err.message}`);
      return { asignados: 0, error: err.message };
    }
  }

  // ============================================
  // ASIGNAR NUEVA CUENTA (Cola Prioritaria y Auto-Asignación)
  // ============================================

  /**
   * Asigna inmediatamente una cuenta de inventario disponible a un ticket de garantía aprobado
   * (usando la lógica FIFO de cola prioritaria), reactiva la suscripción y envía credenciales por WhatsApp.
   */
  async assignAccountToTicket(ticketId: string, adminId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        subscription: {
          include: {
            plan: { include: { service: true } },
            account: true,
            customer: { include: { user: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket de soporte no encontrado');

    if (ticket.estado === 'aprobado_reemplazo') {
      throw new BadRequestException('Este ticket ya tiene una nueva cuenta asignada y se encuentra completamente resuelto.');
    }

    if (ticket.estado === 'rechazado') {
      throw new BadRequestException('Este ticket fue rechazado previamente.');
    }

    const subscription = ticket.subscription;
    if (!subscription) {
      throw new BadRequestException('La suscripción asociada al ticket no existe.');
    }

    // 1. Buscar una cuenta disponible en inventario para este plan (FIFO: la más antigua disponible)
    const cuentaDisponible = await this.prisma.account.findFirst({
      where: {
        planId: subscription.planId,
        estado: AccountStatus.DISPONIBLE,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!cuentaDisponible) {
      return {
        exito: false,
        asignada: false,
        mensaje: `No hay cuentas disponibles en inventario actualmente para ${subscription.plan.service.nombre} (${subscription.plan.nombrePlan}). El ticket permanece en la cola prioritaria y se le asignará la cuenta automáticamente tan pronto ingrese stock.`,
      };
    }

    // 2. Transacción atómica de asignación inmediata
    const resultado = await this.prisma.$transaction(async (tx) => {
      // Marcar cuenta anterior como defectuosa si no lo estaba
      if (subscription.accountId && subscription.account?.estado !== AccountStatus.DEFECTUOSA) {
        await tx.account.update({
          where: { id: subscription.accountId },
          data: { estado: AccountStatus.DEFECTUOSA },
        });
      }

      // Marcar la nueva cuenta de inventario como OCUPADA
      await tx.account.update({
        where: { id: cuentaDisponible.id },
        data: { estado: AccountStatus.OCUPADA },
      });

      // Asignar nueva cuenta a la suscripción, reactivarla y descongelar días si existían
      const nowAuto = new Date();
      let fechaVencAuto = subscription.fechaVencimiento;
      if (subscription.diasPendientes && subscription.diasPendientes > 0) {
        fechaVencAuto = new Date(nowAuto.getTime() + subscription.diasPendientes * 24 * 60 * 60 * 1000);
      }

      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          accountId: cuentaDisponible.id,
          estado: SubscriptionStatus.ACTIVA,
          fechaVencimiento: fechaVencAuto,
          diasPendientes: 0,
          congeladoAt: null,
        },
      });

      // Actualizar ticket a resuelto con reemplazo
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          estado: 'aprobado_reemplazo',
          resueltoPor: adminId,
          resolvedAt: new Date(),
        },
      });

      // Actualizar tasa de fallo del lote de la cuenta anterior si aplica
      if (subscription.account?.batchId) {
        await this.actualizarTasaFallo(tx, subscription.account.batchId);
      }

      return {
        exito: true,
        asignada: true,
        nuevaCuenta: {
          id: cuentaDisponible.id,
          codigo: `#ACC-${cuentaDisponible.id.substring(0, 8).toUpperCase()}`,
          email: cuentaDisponible.emailCuenta,
          password: cuentaDisponible.passwordCuenta,
          perfil: cuentaDisponible.perfilAsignado,
          pin: cuentaDisponible.pinPerfil,
        },
      };
    });

    this.logger.log(
      `[ASIGNACIÓN GARANTÍA] Cuenta ${cuentaDisponible.emailCuenta} asignada al ticket ${ticket.id} del cliente ${subscription.customer.user.nombre}`,
    );

    // 3. Enviar datos de acceso automáticamente por WhatsApp al cliente
    const phone = subscription.customer.whatsapp || subscription.customer.user.phone;
    if (phone) {
      try {
        await this.whatsappService.sendWarrantyReplacementMessage(
          phone,
          subscription.customer.user.nombre,
          {
            plan: subscription.plan,
            account: resultado.nuevaCuenta,
          },
        );
      } catch (err: any) {
        this.logger.error(`Error enviando WhatsApp de reemplazo asignado: ${err.message}`);
      }
    }

    return {
      exito: true,
      asignada: true,
      mensaje: `¡Cuenta asignada exitosamente! Se asignó la cuenta ${resultado.nuevaCuenta.email} (${resultado.nuevaCuenta.perfil || 'Perfil Principal'}) y se enviaron los datos de acceso al cliente vía WhatsApp.`,
      nuevaCuenta: resultado.nuevaCuenta,
    };
  }

  // RECHAZAR TICKET
  private async rejectTicket(ticket: any, adminId: string, motivo?: string) {
    if (!motivo) {
      throw new BadRequestException(
        'Debes proporcionar un motivo para rechazar el ticket',
      );
    }

    // Transacción atómica: actualizar ticket + restaurar suscripción
    await this.prisma.$transaction(async (tx) => {
      // 1. Marcar ticket como rechazado
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          estado: 'rechazado',
          resueltoPor: adminId,
          resolvedAt: new Date(),
        },
      });

      // 2. Restaurar suscripción verificando si venció mientras estaba en garantía
      const ahora = new Date();
      const yaVencio = new Date(ticket.subscription.fechaVencimiento) < ahora;

      await tx.subscription.update({
        where: { id: ticket.subscriptionId },
        data: {
          estado: yaVencio
            ? SubscriptionStatus.VENCIDA
            : SubscriptionStatus.ACTIVA,
        },
      });
    });

    // 3. Notificar al cliente por WhatsApp (fuera de la transacción)
    try {
      await this.whatsappService.sendTextMessage(
        ticket.subscription.customer.whatsapp,
        `Hola ${ticket.subscription.customer.user.nombre}, hemos revisado tu reporte sobre ${ticket.subscription.plan.service.nombre} y determinamos que no aplica para garantía.\n\nMotivo: ${motivo}\n\nRecuerda las reglas de uso:\n1️⃣ No cambiar contraseña ni correo\n2️⃣ No crear ni modificar el PIN\n3️⃣ No exceder pantallas simultáneas\n\nSi tienes dudas, responde este mensaje.`,
      );
    } catch (error) {
      this.logger.error(`Error notificando rechazo: ${error.message}`);
    }

    // AUDITORÍA DEL SISTEMA
    await this.auditService.registrarEvento({
      usuarioId: adminId,
      modulo: AuditCategory.GARANTIAS,
      accion: 'GARANTIA_RECHAZADA',
      severidad: AuditSeverity.WARNING,
      descripcion: `Ticket de soporte/garantía #${ticket.id.slice(-6).toUpperCase()} RECHAZADO para el cliente ${ticket.subscription?.customer?.user?.nombre || 'Cliente'}. Motivo: "${motivo}"`,
      entidad: 'SupportTicket',
      entidadId: ticket.id,
      detalles: {
        ticketId: ticket.id,
        cliente: ticket.subscription?.customer?.user?.nombre,
        servicio: ticket.subscription?.plan?.service?.nombre,
        motivoRechazo: motivo,
      },
      exito: false,
    });

    return {
      message: 'Ticket rechazado y cliente notificado',
      ticketId: ticket.id,
    };
  }

  // ============================================
  // CONTROL DE CALIDAD DE LOTES
  // ============================================

  // ACTUALIZAR TASA DE FALLO DE UN LOTE
  private async actualizarTasaFallo(tx: any, batchId: string) {
    const batch = await tx.supplierBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) return;

    // Contar cuentas defectuosas del lote
    const defectuosas = await tx.account.count({
      where: { batchId, estado: AccountStatus.DEFECTUOSA },
    });

    const tasaFallo = (defectuosas / batch.cantidadCuentas) * 100;

    // Actualizar tasa
    await tx.supplierBatch.update({
      where: { id: batchId },
      data: { tasaFalloActual: tasaFallo },
    });

    // Si supera el 15%, poner en cuarentena automáticamente
    if (tasaFallo > 15 && batch.estadoLote === 'activo') {
      await tx.supplierBatch.update({
        where: { id: batchId },
        data: { estadoLote: 'cuarentena' },
      });

      // Pausar todas las cuentas disponibles del lote
      await tx.account.updateMany({
        where: { batchId, estado: AccountStatus.DISPONIBLE },
        data: { estado: AccountStatus.VENCIDA }, // Usamos VENCIDA como "pausada"
      });

      this.logger.warn(
        `⚠️ LOTE ${batchId} EN CUARENTENA: Tasa de fallo ${tasaFallo.toFixed(1)}%`,
      );
    }
  }

  // OBTENER TODOS LOS LOTES CON SU ESTADO
  async getAllBatches() {
    const batches = await this.prisma.supplierBatch.findMany({
      include: {
        accounts: {
          select: { estado: true },
        },
      },
      orderBy: { fechaCompra: 'desc' },
    });

    return batches.map((batch) => {
      const estadoCounts = batch.accounts.reduce(
        (acc, a) => {
          acc[a.estado] = (acc[a.estado] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        id: batch.id,
        proveedor: batch.proveedorNombre,
        fechaCompra: batch.fechaCompra,
        costoTotal: batch.costoTotalLote,
        cantidadCuentas: batch.cantidadCuentas,
        tasaFallo: batch.tasaFalloActual,
        estado: batch.estadoLote,
        desglose: {
          disponibles: estadoCounts['DISPONIBLE'] || 0,
          ocupadas: estadoCounts['OCUPADA'] || 0,
          defectuosas: estadoCounts['DEFECTUOSA'] || 0,
          vencidas: estadoCounts['VENCIDA'] || 0,
        },
      };
    });
  }

  // PONER LOTE EN CUARENTENA MANUALMENTE
  async quarantineBatch(batchId: string, razon: string, adminId?: string) {
    const batch = await this.prisma.supplierBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) throw new NotFoundException('Lote no encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.supplierBatch.update({
        where: { id: batchId },
        data: { estadoLote: 'cuarentena' },
      });

      await tx.account.updateMany({
        where: { batchId, estado: AccountStatus.DISPONIBLE },
        data: { estado: AccountStatus.VENCIDA },
      });
    });

    this.logger.warn(`Lote ${batchId} puesto en cuarentena: ${razon}`);

    // AUDITORÍA DEL SISTEMA
    await this.auditService.registrarEvento({
      usuarioId: adminId,
      modulo: AuditCategory.INVENTARIO,
      accion: 'LOTE_EN_CUARENTENA',
      severidad: AuditSeverity.WARNING,
      descripcion: `Lote de proveedor "${batch.proveedorNombre}" puesto en CUARENTENA. Razón: "${razon}"`,
      entidad: 'SupplierBatch',
      entidadId: batchId,
      detalles: {
        batchId,
        proveedor: batch.proveedorNombre,
        razon,
        cantidadCuentas: batch.cantidadCuentas,
        tasaFallo: batch.tasaFalloActual,
      },
      exito: true,
    });

    return {
      message: `Lote puesto en cuarentena. Razón: ${razon}`,
      batchId,
    };
  }

  // REACTIVAR LOTE (Después de resolver con el proveedor)
  async reactivateBatch(batchId: string, adminId?: string) {
    const batch = await this.prisma.supplierBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) throw new NotFoundException('Lote no encontrado');
    if (batch.estadoLote !== 'cuarentena') {
      throw new BadRequestException('Este lote no está en cuarentena');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.supplierBatch.update({
        where: { id: batchId },
        data: { estadoLote: 'activo' },
      });

      // Reactivar cuentas que fueron pausadas (las que estaban como VENCIDA pero no tienen suscripción)
      const cuentasPausadas = await tx.account.findMany({
        where: {
          batchId,
          estado: AccountStatus.VENCIDA,
          subscriptions: { none: { estado: SubscriptionStatus.ACTIVA } },
        },
        select: { id: true },
      });

      for (const cuenta of cuentasPausadas) {
        await tx.account.update({
          where: { id: cuenta.id },
          data: { estado: AccountStatus.DISPONIBLE },
        });
      }
    });

    // AUDITORÍA DEL SISTEMA
    await this.auditService.registrarEvento({
      usuarioId: adminId,
      modulo: AuditCategory.INVENTARIO,
      accion: 'LOTE_REACTIVADO',
      severidad: AuditSeverity.SUCCESS,
      descripcion: `Lote de proveedor "${batch.proveedorNombre}" REACTIVADO desde cuarentena. Cuentas restablecidas a disponibles.`,
      entidad: 'SupplierBatch',
      entidadId: batchId,
      detalles: {
        batchId,
        proveedor: batch.proveedorNombre,
        cantidadCuentas: batch.cantidadCuentas,
      },
      exito: true,
    });

    return {
      message: 'Lote reactivado y cuentas disponibles restauradas',
      batchId,
    };
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private calcularTiempoEnCola(createdAt: Date, ahora: Date): string {
    const diffMs = ahora.getTime() - createdAt.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));

    if (diffMin < 60) return `${diffMin} min`;
    const horas = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (horas < 24) return `${horas}h ${mins}m`;
    const dias = Math.floor(horas / 24);
    return `${dias}d ${horas % 24}h`;
  }
}