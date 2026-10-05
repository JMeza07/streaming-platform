import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, SubscriptionStatus, AccountStatus, AuditCategory, AuditSeverity, UserRole } from '@prisma/client';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // 1. LISTAR CLIENTES CON FILTROS Y RESUMEN FINANCIERO
  async findAll(filters: {
    search?: string;
    status?: string;
    plataforma?: string;
    startDate?: string;
    endDate?: string;
    hasOrders?: string;
  }, currentUser?: any) {
    const where: any = {};

    const currentUserId = currentUser?.userId || currentUser?.id;
    const isVendedor = currentUser?.rol === UserRole.VENDEDOR;
    const isAsesor = currentUser?.rol === UserRole.ASESOR_COMERCIAL;

    // Aislamiento estricto de clientes:
    // Vendedores solo ven clientes que tienen al menos una venta/orden asociada a ellos
    if (isVendedor) {
      where.orders = { some: { vendedorId: currentUserId } };
    }
    // Asesores comerciales solo ven clientes que han conseguido Y que han adquirido una suscripción
    else if (isAsesor) {
      where.orders = { some: { vendedorId: currentUserId } };
      where.subscriptions = { some: {} };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const hasta = new Date(filters.endDate);
        hasta.setHours(23, 59, 59, 999);
        where.createdAt.lte = hasta;
      }
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
            phone: true,
            activo: true,
            createdAt: true,
          },
        },
        subscriptions: {
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
                perfilAsignado: true,
                pinPerfil: true,
                estado: true,
              },
            },
          },
        },
        orders: {
          where: {
            estado: OrderStatus.PAGADO,
            ...(isVendedor || isAsesor ? { vendedorId: currentUserId } : {}),
          },
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    let items = customers.map((c) => {
      const totalGastado = c.orders.reduce(
        (sum, o) => sum + (Number(o.total) || 0),
        0
      );

      // Plataformas únicas adquiridas con sus respectivos IDs de cuenta
      const plataformasMap = new Map<
        string,
        { id: string; nombre: string; logoUrl: string | null; accountIds: string[]; accountCodes: string[] }
      >();

      const cuentasMap = new Map<string, any>();

      c.subscriptions.forEach((sub) => {
        const accId = sub.accountId || sub.account?.id;
        const accCode = accId ? `#ACC-${accId.substring(0, 8).toUpperCase()}` : null;

        if (sub.plan?.service) {
          const existing = plataformasMap.get(sub.plan.service.id);
          if (existing) {
            if (accId && !existing.accountIds.includes(accId)) {
              existing.accountIds.push(accId);
            }
            if (accCode && !existing.accountCodes.includes(accCode)) {
              existing.accountCodes.push(accCode);
            }
          } else {
            plataformasMap.set(sub.plan.service.id, {
              id: sub.plan.service.id,
              nombre: sub.plan.service.nombre,
              logoUrl: sub.plan.service.logoUrl,
              accountIds: accId ? [accId] : [],
              accountCodes: accCode ? [accCode] : [],
            });
          }
        }

        if (accId && !cuentasMap.has(accId)) {
          cuentasMap.set(accId, {
            id: accId,
            codigo: accCode,
            servicio: sub.plan?.service?.nombre || 'Servicio',
            plan: sub.plan?.nombrePlan || '',
            emailCuenta: sub.account?.emailCuenta || '',
            perfilAsignado: sub.account?.perfilAsignado || null,
            pinPerfil: sub.account?.pinPerfil || null,
            estadoCuenta: sub.account?.estado || null,
            subscriptionId: sub.id,
            estadoSub: sub.estado,
          });
        }
      });

      const plataformas = Array.from(plataformasMap.values());
      const cuentas = Array.from(cuentasMap.values());

      // Suscripciones activas
      const suscripcionesActivas = c.subscriptions.filter(
        (s) =>
          s.estado === SubscriptionStatus.ACTIVA &&
          new Date(s.fechaVencimiento) > now
      ).length;

      const ultimoPedido = c.orders.length > 0 ? c.orders[0].createdAt : null;

      return {
        id: c.id,
        userId: c.user.id,
        nombre: c.user.nombre,
        email: c.user.email,
        telefono: c.whatsapp || c.user.phone || '',
        whatsapp: c.whatsapp || c.user.phone || '',
        pais: c.pais || 'Colombia',
        optOutWhatsapp: c.optOutWhatsapp,
        activo: c.user.activo,
        createdAt: c.createdAt,
        totalGastado,
        walletBalance: c.walletBalance || 0,
        strikes: c.strikes || 0,
        estadoUsuario: c.estadoUsuario || 'ACTIVO',
        totalOrdenes: c.orders.length,
        totalSuscripciones: c.subscriptions.length,
        suscripcionesActivas,
        ultimoPedido,
        plataformas,
        cuentas,
      };
    });

    // Filtro por texto de búsqueda (nombre, email, teléfono, país, ID de cuenta, código #ACC o correo de cuenta)
    if (filters.search) {
      const term = filters.search.toLowerCase();
      items = items.filter(
        (c) =>
          c.nombre.toLowerCase().includes(term) ||
          (c.email && c.email.toLowerCase().includes(term)) ||
          c.telefono.includes(term) ||
          c.pais.toLowerCase().includes(term) ||
          c.cuentas?.some(
            (a: any) =>
              a.id?.toLowerCase().includes(term) ||
              a.codigo?.toLowerCase().includes(term) ||
              a.emailCuenta?.toLowerCase().includes(term)
          )
      );
    }

    // Filtro por estado activo / suspendido
    if (filters.status) {
      if (filters.status === 'ACTIVO') {
        items = items.filter((c) => c.activo);
      } else if (filters.status === 'SUSPENDIDO') {
        items = items.filter((c) => !c.activo);
      }
    }

    // Filtro por plataforma adquirida
    if (filters.plataforma) {
      const platSearch = filters.plataforma.toLowerCase();
      items = items.filter((c) =>
        c.plataformas.some(
          (p) =>
            p.nombre.toLowerCase() === platSearch ||
            p.id === filters.plataforma
        )
      );
    }

    // Filtro por compras
    if (filters.hasOrders) {
      if (filters.hasOrders === 'yes') {
        items = items.filter((c) => c.totalOrdenes > 0);
      } else if (filters.hasOrders === 'no') {
        items = items.filter((c) => c.totalOrdenes === 0);
      }
    }

    return items;
  }

  // 2. OBTENER DETALLE 360° DE UN CLIENTE
  async findOne(id: string, currentUser?: any) {
    const currentUserId = currentUser?.userId || currentUser?.id;
    const isVendedor = currentUser?.rol === UserRole.VENDEDOR;
    const isAsesor = currentUser?.rol === UserRole.ASESOR_COMERCIAL;

    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
            phone: true,
            activo: true,
            createdAt: true,
          },
        },
        subscriptions: {
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
          },
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          include: {
            items: {
              include: {
                plan: {
                  include: {
                    service: { select: { id: true, nombre: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        supportTickets: {
          orderBy: { createdAt: 'desc' },
        },
        infractions: {
          orderBy: { createdAt: 'desc' },
        },
        notificationLogs: {
          orderBy: { fechaEnvio: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    // Aislamiento: Vendedor o Asesor solo puede ver sus clientes asociados
    if (isVendedor || isAsesor) {
      const hasMyOrders = customer.orders.some((o) => o.vendedorId === currentUserId);
      if (!hasMyOrders) {
        throw new NotFoundException('Cliente no encontrado o no tienes permisos para visualizarlo');
      }
      if (isAsesor && customer.subscriptions.length === 0) {
        throw new NotFoundException('Cliente no cuenta con suscripciones adquiridas asociadas');
      }
      customer.orders = customer.orders.filter((o) => o.vendedorId === currentUserId);
    }

    const totalGastado = customer.orders
      .filter((o) => o.estado === OrderStatus.PAGADO)
      .reduce((sum, o) => sum + Number(o.total), 0);

    return {
      ...customer,
      totalGastado,
    };
  }

  // 3. ACTUALIZAR INFORMACIÓN DE CONTACTO
  async update(id: string, dto: UpdateCustomerDto, operator?: any) {
    const isOperatorAdmin = operator?.rol === UserRole.ADMIN;
    const operatorId = operator?.userId || operator?.id || (typeof operator === 'string' ? operator : undefined);

    // Solo el ADMIN puede modificar la contraseña o el estado de la cuenta del cliente
    if (!isOperatorAdmin) {
      delete (dto as any).password;
      delete (dto as any).activo;
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    // Si se modifica el email, verificar que no esté ocupado
    if (dto.email && dto.email !== customer.user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new BadRequestException(
          'El correo electrónico ya se encuentra registrado por otro usuario.'
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let passwordHash: string | undefined;
      if (dto.password && dto.password.trim()) {
        passwordHash = await bcrypt.hash(dto.password.trim(), 10);
      }

      if (dto.nombre || dto.email || dto.phone !== undefined || dto.activo !== undefined || passwordHash) {
        await tx.user.update({
          where: { id: customer.userId },
          data: {
            ...(dto.nombre && { nombre: dto.nombre }),
            ...(dto.email && { email: dto.email }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
            ...(dto.activo !== undefined && { activo: dto.activo }),
            ...(passwordHash && { passwordHash }),
          },
        });
      }

      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: {
          ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp }),
          ...(dto.pais !== undefined && { pais: dto.pais }),
        },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              email: true,
              phone: true,
              activo: true,
            },
          },
        },
      });

      return updatedCustomer;
    });

    // AUDITORÍA DEL SISTEMA
    const passwordChanged = !!(dto.password && dto.password.trim());
    await this.auditService.registrarEvento({
      usuarioId: operatorId,
      modulo: AuditCategory.CLIENTES,
      accion: passwordChanged ? 'CAMBIO_PASSWORD_CLIENTE' : 'MODIFICACION_CLIENTE',
      severidad: passwordChanged ? AuditSeverity.WARNING : AuditSeverity.INFO,
      descripcion: passwordChanged
        ? `Contraseña restablecida/actualizada por operador para el cliente "${customer.user.nombre}" (${customer.user.email})`
        : `Datos de contacto actualizados para el cliente "${customer.user.nombre}" (${customer.user.email})`,
      entidad: 'Customer',
      entidadId: id,
      detalles: {
        clienteId: id,
        clienteNombre: customer.user.nombre,
        clienteEmail: customer.user.email,
        cambioPassword: passwordChanged,
        camposModificados: Object.keys(dto).filter((k) => k !== 'password'),
      },
      exito: true,
    });

    return {
      message: 'Información del cliente actualizada exitosamente',
      customer: updated,
    };
  }

  // 4. SUSPENDER O REACTIVAR CLIENTE
  async toggleActive(id: string, operatorId?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    const nextStatus = !customer.user.activo;

    await this.prisma.user.update({
      where: { id: customer.userId },
      data: { activo: nextStatus },
    });

    // AUDITORÍA DEL SISTEMA
    await this.auditService.registrarEvento({
      usuarioId: operatorId,
      modulo: AuditCategory.CLIENTES,
      accion: nextStatus ? 'REACTIVACION_CLIENTE' : 'SUSPENSION_CLIENTE',
      severidad: nextStatus ? AuditSeverity.SUCCESS : AuditSeverity.WARNING,
      descripcion: `Cliente "${customer.user.nombre}" (${customer.user.email}) fue ${
        nextStatus ? 'REACTIVADO' : 'SUSPENDIDO/BLOQUEADO'
      } en la plataforma`,
      entidad: 'Customer',
      entidadId: id,
      detalles: {
        clienteId: id,
        clienteNombre: customer.user.nombre,
        nuevoEstadoActivo: nextStatus,
      },
      exito: true,
    });

    return {
      message: `Cliente ${customer.user.nombre} ha sido ${
        nextStatus ? 'reactivado' : 'suspendido / bloqueado'
      } exitosamente`,
      activo: nextStatus,
    };
  }

  // 5. ELIMINAR CLIENTE DE FORMA SEGURA (Con liberación de inventario y limpieza)
  async deleteCustomer(id: string, operatorId?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        subscriptions: true,
        orders: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Liberar cuentas asignadas a las suscripciones del cliente (volver a DISPONIBLE)
      for (const sub of customer.subscriptions) {
        if (sub.accountId) {
          await tx.account
            .update({
              where: { id: sub.accountId },
              data: { estado: AccountStatus.DISPONIBLE },
            })
            .catch(() => null);
        }
      }

      // 2. Eliminar logs de notificaciones
      await tx.notificationLog.deleteMany({
        where: { customerId: id },
      });

      // 3. Eliminar tickets de soporte
      await tx.supportTicket.deleteMany({
        where: { customerId: id },
      });

      // 4. Eliminar suscripciones
      await tx.subscription.deleteMany({
        where: { customerId: id },
      });

      // 5. Eliminar pedidos y sus comisiones / items asociados
      const orderIds = customer.orders.map((o) => o.id);
      if (orderIds.length > 0) {
        await tx.commission.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        await tx.order.deleteMany({
          where: { id: { in: orderIds } },
        });
      }

      // 6. Eliminar registro del Cliente
      await tx.customer.delete({
        where: { id },
      });

      // 7. Eliminar Usuario
      await tx.user.delete({
        where: { id: customer.userId },
      });
    });

    // AUDITORÍA DEL SISTEMA
    await this.auditService.registrarEvento({
      usuarioId: operatorId,
      modulo: AuditCategory.CLIENTES,
      accion: 'ELIMINACION_CLIENTE',
      severidad: AuditSeverity.CRITICAL,
      descripcion: `Cliente "${customer.user.nombre}" (${customer.user.email}) ELIMINADO permanentemente del sistema con todas sus órdenes y suscripciones liberadas.`,
      entidad: 'Customer',
      entidadId: id,
      detalles: {
        clienteId: id,
        nombre: customer.user.nombre,
        email: customer.user.email,
        suscripcionesLiberadas: customer.subscriptions.length,
        ordenesAfectadas: customer.orders.length,
      },
      exito: true,
    });

    return {
      message: `Cliente ${customer.user.nombre} eliminado exitosamente. Cuentas asociadas liberadas al inventario disponible.`,
    };
  }
}
