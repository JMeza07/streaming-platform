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
import { toTitleCase, normalizeE164 } from '../../common/utils/formatters.util';

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
    const where: any = {
      deletedAt: null,
    };

    // Regla estricta: NINGÚN usuario interno o administrador puede aparecer como cliente
    where.user = { rol: UserRole.CLIENTE, deletedAt: null };

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
            rol: true,
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

    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
            phone: true,
            rol: true,
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

    if (!customer || customer.user?.rol !== UserRole.CLIENTE) {
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

    if (!customer || customer.user?.rol !== UserRole.CLIENTE) {
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
        const formattedNombre = dto.nombre ? toTitleCase(dto.nombre) : undefined;
        const formattedPhone = dto.phone ? normalizeE164(dto.phone) : undefined;
        await tx.user.update({
          where: { id: customer.userId },
          data: {
            ...(formattedNombre && { nombre: formattedNombre }),
            ...(dto.email && { email: dto.email }),
            ...(formattedPhone !== undefined && { phone: formattedPhone }),
            ...(dto.activo !== undefined && { activo: dto.activo }),
            ...(passwordHash && { passwordHash }),
          },
        });
      }

      const formattedWhatsapp = dto.whatsapp ? normalizeE164(dto.whatsapp) : undefined;
      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: {
          ...(formattedWhatsapp !== undefined && { whatsapp: formattedWhatsapp }),
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

    if (!customer || customer.user?.rol !== UserRole.CLIENTE) {
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

  // 5. ELIMINAR CLIENTE DE FORMA SEGURA (BORRADO LÓGICO - SRS RESTRICCIÓN 2.3)
  async deleteCustomer(id: string, operatorId?: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: true,
        subscriptions: { where: { estado: SubscriptionStatus.ACTIVA } },
        orders: true,
      },
    });

    if (!customer || customer.user?.rol !== UserRole.CLIENTE) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado o ya dado de baja`);
    }

    const previousData = {
      id: customer.id,
      nombre: customer.user.nombre,
      email: customer.user.email,
      whatsapp: customer.whatsapp,
      activo: customer.user.activo,
      estadoUsuario: customer.estadoUsuario,
      suscripcionesActivas: customer.subscriptions.length,
    };

    await this.prisma.$transaction(async (tx) => {
      // 1. Liberar perfiles asociados a suscripciones activas para reasignación en inventario
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

      // 2. Marcar suscripciones activas como CANCELADAS
      if (customer.subscriptions.length > 0) {
        await tx.subscription.updateMany({
          where: { customerId: id, estado: SubscriptionStatus.ACTIVA },
          data: { estado: SubscriptionStatus.CANCELADA },
        });
      }

      // 3. Borrado lógico del registro Customer (SRS 2.3)
      await tx.customer.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          estadoUsuario: 'ELIMINADO',
        },
      });

      // 4. Borrado lógico y suspensión del Usuario asociado (SRS 2.3)
      await tx.user.update({
        where: { id: customer.userId },
        data: {
          activo: false,
          deletedAt: new Date(),
        },
      });

      // 5. Revocar sesiones activas del cliente
      await tx.refreshToken.updateMany({
        where: { userId: customer.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    const nextData = {
      id: customer.id,
      activo: false,
      deletedAt: new Date().toISOString(),
      estadoUsuario: 'ELIMINADO',
    };

    // AUDITORÍA INMUTABLE CON DIFF ANTERIOR/NUEVO (SRS RF-037 / RNF-S08)
    await this.auditService.registrarEvento({
      usuarioId: operatorId,
      modulo: AuditCategory.CLIENTES,
      accion: 'BAJA_LOGICA_CLIENTE',
      severidad: AuditSeverity.WARNING,
      descripcion: `Cliente "${customer.user.nombre}" (${customer.user.email || customer.whatsapp}) dado de baja lógicamente. Se preservó el historial de órdenes y se liberaron ${customer.subscriptions.length} pantalla(s) al inventario.`,
      entidad: 'Customer',
      entidadId: id,
      valoresAnteriores: previousData,
      valoresNuevos: nextData,
      detalles: {
        clienteId: id,
        nombre: customer.user.nombre,
        email: customer.user.email,
        suscripcionesLiberadas: customer.subscriptions.length,
        ordenesPreservadas: customer.orders.length,
      },
      exito: true,
    });

    return {
      message: `Cliente ${customer.user.nombre} dado de baja lógicamente con éxito. Las pantallas activas fueron devueltas al inventario disponible.`,
    };
  }

  // =========================================================================
  // SRS REQ. ADICIONAL 1 (PUNTO 23): MODAL WHATSAPP CON PROMOCIÓN PERSONALIZADA
  // =========================================================================
  async generateCustomPromoMessage(
    customerId: string,
    motivo: 'RENOVACION' | 'VENTA_CRUZADA' | 'PROMOCION_LEALTAD' | 'GARANTIA_SEGUIMIENTO' | 'RECUPERACION' = 'PROMOCION_LEALTAD',
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: true,
        subscriptions: {
          include: {
            plan: {
              include: { service: true },
            },
          },
          orderBy: { fechaVencimiento: 'desc' },
        },
        orders: {
          where: { estado: OrderStatus.PAGADO },
          include: {
            items: {
              include: {
                plan: { include: { service: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const nombre = toTitleCase(customer.user.nombre || 'Estimado(a) Cliente');
    const whatsapp = normalizeE164(customer.whatsapp || customer.user.phone);

    // Identificar plataformas contratadas
    const plataformasCompradas = Array.from(
      new Set(
        customer.subscriptions
          .map((s) => s.plan?.service?.nombre)
          .filter(Boolean) as string[],
      ),
    );

    const ultimaSub = customer.subscriptions[0] || null;
    const ultimoServicio = ultimaSub?.plan?.service?.nombre || 'Streaming';
    const ultimoPlan = ultimaSub?.plan?.nombrePlan || 'Plan Premium';

    let mensaje = '';

    switch (motivo) {
      case 'RENOVACION':
        mensaje =
          `Hola ${nombre} 👋 Te saludamos desde *OASIS VIRTUAL STORE* ✨\n\n` +
          `Queremos recordarte que tu servicio de *${ultimoServicio} (${ultimoPlan})* está próximo a vencer o venció recientemente ⏳\n\n` +
          `🔥 *¡Renueva hoy mismo y no pierdas tu historial, perfiles ni descargas!* Además, mantendrás tu tarifa preferencial de cliente fidelizado.\n\n` +
          `¿Deseas que te enviemos los datos de pago para dejarlo activo ahora mismo? 📲`;
        break;

      case 'VENTA_CRUZADA':
        const serviciosRecomendados = ['Disney+ Premium', 'Max (HBO)', 'Spotify Premium', 'Prime Video']
          .filter((s) => !plataformasCompradas.includes(s));
        const recomendada = serviciosRecomendados[0] || 'nuestro Combo Especial';

        mensaje =
          `Hola ${nombre} 🍿 Esperamos que estés disfrutando al máximo tu *${ultimoServicio}* con nosotros 🎉\n\n` +
          `Sabemos que te encantan las mejores películas y series, por eso hoy tenemos un *BENEFICIO EXCLUSIVO* para ti:\n` +
          `🔥 Agrega *${recomendada}* a tu cuenta con un *15% de descuento especial* por ser cliente activo de OASIS VIRTUAL STORE ✨\n\n` +
          `¿Te gustaría activarlo hoy y disfrutar de estrenos imperdibles? 🎬`;
        break;

      case 'GARANTIA_SEGUIMIENTO':
        mensaje =
          `Hola ${nombre} 👋 Te escribimos del equipo de soporte y calidad de *OASIS VIRTUAL STORE* 🛡️\n\n` +
          `Nos comunicamos para verificar si tu servicio de *${ultimoServicio}* está funcionando con total normalidad y fluidez tras la atención brindada 📺\n\n` +
          `Tu satisfacción es nuestra máxima prioridad. ¿Todo se encuentra en orden o requieres algún ajuste adicional? Estamos atentos para apoyarte ✨`;
        break;

      case 'RECUPERACION':
        mensaje =
          `¡Hola ${nombre}! 🎉 En *OASIS VIRTUAL STORE* te hemos extrañado mucho ✨\n\n` +
          `Queremos que vuelvas a disfrutar del mejor entretenimiento al mejor precio del mercado 🍿\n\n` +
          `🎁 *CUPÓN DE BIENVENIDA:* Reactiva cualquier plataforma hoy (Netflix, Disney+, Max, etc.) y recibe *$3.000 COP de descuento directo* en tu orden 🚀\n\n` +
          `¿Cuál plataforma quisieras disfrutar este mes? Responde a este mensaje para activar tu cupón 📲`;
        break;

      case 'PROMOCION_LEALTAD':
      default:
        mensaje =
          `Hola ${nombre} ✨ ¡Gracias por ser parte de la familia *OASIS VIRTUAL STORE*! 🌟\n\n` +
          `Por tu excelente fidelidad con nosotros, hoy tenemos disponible una promoción VIP en renovación y combos especiales multi-pantalla 🎁\n\n` +
          `🚀 Disfruta de soporte prioritario 24/7 y garantía total garantizada.\n` +
          `¿Deseas conocer nuestro catálogo promocional vigente? 📲`;
        break;
    }

    const encodedText = encodeURIComponent(mensaje);
    const cleanPhone = whatsapp.replace('+', '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    return {
      cliente: {
        id: customer.id,
        nombre,
        whatsapp,
        plataformasCompradas,
        totalSuscripciones: customer.subscriptions.length,
        totalOrdenes: customer.orders.length,
      },
      motivo,
      mensajeGenerado: mensaje,
      whatsappUrl,
    };
  }
}

