import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateSellerSaleDto } from './dto/create-seller-sale.dto';
import * as bcrypt from 'bcrypt';
import { OrderStatus, AccountStatus, UserRole, SubscriptionStatus, AuditCategory, AuditSeverity } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OrdersService {
  private readonly COMMISSION_RATES: Record<string, number> = {
    bronce: 0.10,
    plata: 0.15,
    oro: 0.20,
    diamante: 0.25,
  };

  constructor(
    private prisma: PrismaService,
    private accountsService: AccountsService,
    private whatsappService: WhatsappService,
    private auditService: AuditService,
  ) {}

  // CREAR ORDEN (Checkout)
  async createOrder(dto: CreateOrderDto) {
    // 1. Validar que el cliente existe y es un cliente legítimo (no usuario interno/administrador)
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      include: { user: true },
    });
    if (!customer || customer.user?.rol !== UserRole.CLIENTE) {
      throw new BadRequestException('El cliente seleccionado no es válido o corresponde a un usuario del sistema.');
    }

    // 2. Calcular totales y validar planes existen
    let total = 0;
    const itemsData = [];

    for (const item of dto.items) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: item.planId },
        include: { service: true },
      });
      if (!plan || !plan.activo) throw new NotFoundException(`Plan ${item.planId} no disponible`);

      const subtotal = plan.precio.toNumber() * item.cantidad;
      total += subtotal;

      itemsData.push({
        planId: item.planId,
        cantidad: item.cantidad,
        precioUnitario: plan.precio,
        subtotal,
        nombrePlan: plan.nombrePlan,
      });
    }

    // Verificar si viene referido o vendedor asignado
    let vendedorId: string | null = dto.vendedorId || null;
    let vendedorNombre: string | null = null;
    if (dto.codigoReferido) {
      const aff = await this.prisma.affiliate.findUnique({
        where: { codigoReferido: dto.codigoReferido.trim().toUpperCase() },
        include: { user: true },
      });
      if (aff) {
        vendedorId = aff.userId;
        vendedorNombre = aff.user.nombre;
      }
    } else if (vendedorId) {
      const u = await this.prisma.user.findUnique({ where: { id: vendedorId } });
      if (u) vendedorNombre = u.nombre;
    }

    const fechaHoraCreacion = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const descripcionVentaInicial = vendedorNombre
      ? `Orden registrada por Vendedor: ${vendedorNombre} | Fecha y Hora: ${fechaHoraCreacion}`
      : `Venta online directa | Fecha y Hora: ${fechaHoraCreacion}`;

    // 3. Crear la orden en transacción con reserva TTL de 15 minutos (Escenario 8)
    const order = await this.prisma.$transaction(async (tx) => {
      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000);

      // Validar y reservar stock atómicamente con TTL de 15 minutos
      for (const item of itemsData) {
        const availableAccounts = await tx.account.findMany({
          where: { planId: item.planId, estado: AccountStatus.DISPONIBLE },
          take: item.cantidad,
          orderBy: { createdAt: 'asc' },
        });

        if (availableAccounts.length < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para ${item.nombrePlan}. Disponibles: ${availableAccounts.length}`,
          );
        }

        // Marcar perfiles reservados como PENDIENTE_PAGO con TTL de 15 minutos
        for (const acc of availableAccounts) {
          await tx.account.update({
            where: { id: acc.id },
            data: {
              estado: AccountStatus.PENDIENTE_PAGO,
              reservedUntil,
              reservedByCustomerId: dto.customerId,
            },
          });
        }
      }

      // Remover campo auxiliar antes de insertar
      const cleanItems = itemsData.map(({ nombrePlan, ...rest }) => rest);

      const newOrder = await tx.order.create({
        data: {
          customerId: dto.customerId,
          total,
          estado: OrderStatus.PENDIENTE,
          metodoPago: dto.metodoPago,
          comprobanteUrl: dto.comprobanteUrl,
          clase: dto.clase || 'NUEVA',
          banco: dto.banco || null,
          aut: dto.aut || null,
          vendedorId,
          vendedorNombre,
          descripcionVenta: dto.descripcionVenta || descripcionVentaInicial,
          items: {
            create: cleanItems,
          },
        },
        include: {
          items: { include: { plan: { include: { service: true } } } },
          customer: { include: { user: true } },
          vendedor: { select: { id: true, nombre: true, email: true, phone: true } },
        },
      });
      return newOrder;
    });

    return {
      message: 'Orden creada exitosamente',
      order,
      siguientePaso: dto.metodoPago === 'tarjeta' 
        ? 'Procesando pago automático...' 
        : 'Envía tu comprobante por WhatsApp para validar',
    };
  }

  // =========================================================================
  // REALIZAR VENTA DIRECTA POR ROL DE VENDEDOR O ADMINISTRADOR (POS)
  // =========================================================================
  async createSellerSale(dto: CreateSellerSaleDto, currentUser: any) {
    // 1. Identificar al vendedor que opera la venta
    const sellerUserId = currentUser.id || currentUser.userId;
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerUserId },
      include: { affiliate: true },
    });

    if (!seller) {
      throw new NotFoundException('Usuario vendedor no encontrado en el sistema');
    }

    // Identificar beneficiario de la venta (afiliado / asesor comercial asignado o el vendedor operador)
    let beneficiaryUser = seller;
    if (dto.afiliadoId && dto.afiliadoId.trim()) {
      const aff = await this.prisma.affiliate.findFirst({
        where: {
          OR: [
            { id: dto.afiliadoId.trim() },
            { userId: dto.afiliadoId.trim() },
            { codigoReferido: dto.afiliadoId.trim().toUpperCase() },
          ],
        },
        include: { user: true },
      });
      if (aff && aff.user) {
        beneficiaryUser = {
          ...aff.user,
          affiliate: aff,
        } as any;
      }
    }

    // 2. Resolver o registrar al cliente
    let customer: any = null;

    if (dto.customerId) {
      customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
        include: { user: true },
      });
      if (!customer || customer.user?.rol !== UserRole.CLIENTE) {
        throw new BadRequestException('El cliente seleccionado no es válido o corresponde a un usuario del sistema.');
      }
    } else {
      // 1. CLAVE PRINCIPAL: Buscar primero por WhatsApp/teléfono para evitar duplicidad
      const cleanPhone = (dto.clienteWhatsapp || '').replace(/\D/g, '');
      const email = dto.clienteEmail?.toLowerCase().trim() || null;

      // REGLA ESTRICTA: El administrador ni ningún usuario del sistema puede ser ni aparecer como cliente
      if (email) {
        const staffByEmail = await this.prisma.user.findFirst({
          where: {
            email,
            rol: { not: UserRole.CLIENTE },
          },
        });
        if (staffByEmail) {
          throw new BadRequestException(
            `El correo "${email}" pertenece al usuario del sistema "${staffByEmail.nombre}" (${staffByEmail.rol}). Ningún usuario del sistema puede ser cliente.`,
          );
        }
      }

      if (cleanPhone && cleanPhone.length >= 7) {
        const staffByPhone = await this.prisma.user.findFirst({
          where: {
            phone: { in: [cleanPhone, `+${cleanPhone}`] },
            rol: { not: UserRole.CLIENTE },
          },
        });
        if (staffByPhone) {
          throw new BadRequestException(
            `El teléfono "${cleanPhone}" pertenece al usuario del sistema "${staffByPhone.nombre}" (${staffByPhone.rol}). Ningún usuario del sistema puede ser cliente.`,
          );
        }

        customer = await this.prisma.customer.findFirst({
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
      }

      if (!customer) {
        if (!dto.clienteNombre || !cleanPhone) {
          throw new BadRequestException(
            'Debes indicar al menos el Nombre y el WhatsApp/Teléfono (Clave Principal) para registrar un nuevo cliente.',
          );
        }
        let user = email
          ? await this.prisma.user.findUnique({
              where: { email },
              include: { customer: true },
            })
          : null;

        if (user && user.rol !== UserRole.CLIENTE) {
          throw new BadRequestException(
            `El usuario "${user.nombre}" (${user.email}) tiene rol ${user.rol} y no puede operar como cliente.`,
          );
        }

        if (!user) {
          const tempPass = await bcrypt.hash('cliente123', 10);
          user = await this.prisma.user.create({
            data: {
              nombre: dto.clienteNombre.trim(),
              email,
              passwordHash: tempPass,
              phone: cleanPhone,
              rol: UserRole.CLIENTE,
              activo: true,
              customer: {
                create: {
                  whatsapp: cleanPhone,
                  pais: 'Colombia',
                },
              },
            },
            include: { customer: true },
          });
        } else if (!user.customer) {
          await this.prisma.customer.create({
            data: {
              userId: user.id,
              whatsapp: cleanPhone,
              pais: 'Colombia',
            },
          });
          user = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: { customer: true },
          });
        }
        customer = user.customer;
        customer.user = user;
      }
    }

    // 3. Obtener plan y validar stock
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
      include: { service: true },
    });
    if (!plan || !plan.activo) {
      throw new NotFoundException('El plan seleccionado no está disponible en el catálogo');
    }

    const cantidad = dto.cantidad && dto.cantidad > 0 ? dto.cantidad : 1;
    const subtotal = plan.precio.toNumber() * cantidad;
    const total = subtotal;

    const stockDisponible = await this.prisma.account.count({
      where: { planId: plan.id, estado: AccountStatus.DISPONIBLE },
    });
    if (stockDisponible < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente para ${plan.service.nombre} (${plan.nombrePlan}). Disponibles: ${stockDisponible}, Solicitados: ${cantidad}`,
      );
    }

    // 4. Calcular comisión del vendedor o asesor beneficiario
    let comisionMonto = 0;
    let porcentajeAplicado = 0;
    if (beneficiaryUser.affiliate) {
      const rangoKey = (beneficiaryUser.affiliate.rango || 'bronce').toLowerCase();
      const rate = this.COMMISSION_RATES[rangoKey] || 0.15;
      porcentajeAplicado = rate * 100;
      comisionMonto = Math.round(total * rate);
    }

    const fechaHora = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const asesorTag = beneficiaryUser.id !== seller.id
      ? `Asesor Comercial: ${beneficiaryUser.nombre} | Operado en POS por: ${seller.nombre}`
      : `Venta realizada por Vendedor: ${seller.nombre}`;

    const descripcion = `${asesorTag} | Pago: ${dto.metodoPago} | Fecha: ${fechaHora}${
      dto.referenciaExterna ? ` | Ref: ${dto.referenciaExterna}` : ''
    }${dto.notas ? ` | Nota: ${dto.notas}` : ''}${
      comisionMonto > 0 ? ` | Comisión Asesor/Vendedor: $${comisionMonto.toLocaleString('es-CO')} (${porcentajeAplicado}%)` : ''
    }`;

    const autoDespacho = dto.despachoInmediato !== false;

    // Validación obligatoria: Medios de pago electrónicos requieren comprobante
    const isEfectivo =
      dto.metodoPago.toLowerCase().includes('efectivo') ||
      dto.metodoPago.toLowerCase().includes('cash');

    if (!isEfectivo && !dto.comprobanteUrl) {
      throw new BadRequestException(
        `Para ventas realizadas por medio electrónico (${dto.metodoPago}) es obligatorio adjuntar una imagen del comprobante de pago como soporte.`,
      );
    }

    // 5. Transacción atómica de venta
    const resultado = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          total,
          estado: autoDespacho ? OrderStatus.PAGADO : OrderStatus.PENDIENTE,
          metodoPago: dto.metodoPago,
          referenciaExterna: dto.referenciaExterna || null,
          comprobanteUrl: dto.comprobanteUrl || null,
          clase: dto.clase || 'NUEVA',
          banco: dto.banco || null,
          aut: dto.aut || null,
          vendedorId: beneficiaryUser.id,
          vendedorNombre: beneficiaryUser.nombre,
          vendedorPorcentaje: porcentajeAplicado,
          vendedorComision: comisionMonto,
          descripcionVenta: descripcion,
          items: {
            create: [
              {
                planId: plan.id,
                cantidad,
                precioUnitario: plan.precio,
                subtotal,
              },
            ],
          },
        },
      });

      if (!autoDespacho) {
        return { order, suscripciones: [] };
      }

      // Si es despacho inmediato:
      // Acreditar comisión al afiliado/vendedor beneficiario
      if (beneficiaryUser.affiliate && comisionMonto > 0) {
        await tx.affiliate.update({
          where: { id: beneficiaryUser.affiliate.id },
          data: {
            walletBalance: { increment: comisionMonto },
          },
        });

        await tx.commission.create({
          data: {
            affiliateId: beneficiaryUser.affiliate.id,
            orderId: order.id,
            tipo: 'directa',
            porcentaje: porcentajeAplicado / 100,
            montoComision: comisionMonto,
            estado: 'disponible',
          },
        });
      }

      // Asignar cuentas FIFO
      const suscripciones = [];
      let costoAcumulado = 0;

      for (let i = 0; i < cantidad; i++) {
        const account = await tx.account.findFirst({
          where: { planId: plan.id, estado: AccountStatus.DISPONIBLE },
          include: { rootAccount: true },
          orderBy: { createdAt: 'asc' },
        });

        if (!account) {
          throw new BadRequestException(
            `Stock agotado durante la entrega para ${plan.service.nombre} (${plan.nombrePlan})`,
          );
        }

        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + plan.duracionDias);

        let costoPerfil = 0;
        if (account.rootAccount) {
          const maxP = account.rootAccount.maxPerfiles || 5;
          costoPerfil = account.rootAccount.costoCompra ? Number(account.rootAccount.costoCompra) / maxP : Number(account.costoCompra || 0);
        } else {
          costoPerfil = Number(account.costoCompra || 0);
        }
        const ganancia = Math.max(0, Number(plan.precio) - costoPerfil);
        costoAcumulado += costoPerfil;

        const subscription = await tx.subscription.create({
          data: {
            customerId: customer.id,
            planId: plan.id,
            accountId: account.id,
            orderId: order.id,
            clase: dto.clase || 'NUEVA',
            costoPerfil,
            ganancia,
            fechaUltimoCambioClave: new Date(),
            estadoLibre: 'VENDIDA',
            fechaVencimiento,
            estado: SubscriptionStatus.ACTIVA,
          },
          include: {
            account: true,
            plan: { include: { service: true } },
          },
        });

        await tx.account.update({
          where: { id: account.id },
          data: { estado: AccountStatus.OCUPADA },
        });

        suscripciones.push(subscription);
      }

      const gananciaNeta = total - costoAcumulado - (comisionMonto || 0);
      await tx.order.update({
        where: { id: order.id },
        data: {
          costoTotal: costoAcumulado,
          gananciaNeta,
        },
      });

      return { order, suscripciones };
    });

    // 6. Notificar por WhatsApp fuera de la transacción si fue despachado
    if (autoDespacho && resultado.suscripciones.length > 0) {
      try {
        await this.whatsappService.sendDeliveryMessage(
          customer.whatsapp,
          customer.user?.nombre || dto.clienteNombre || 'Cliente',
          resultado.suscripciones,
        );
      } catch (err: any) {
        console.error('Error enviando WhatsApp tras venta de vendedor:', err?.message || err);
      }
    }

    await this.auditService.registrarEvento({
      accion: 'VENTA_POS_VENDEDOR',
      modulo: AuditCategory.VENTAS,
      severidad: AuditSeverity.SUCCESS,
      descripcion: `Venta directa registrada por vendedor ${seller.nombre} para cliente ${customer.user?.nombre || dto.clienteNombre}. Total: $${total.toLocaleString('es-CO')} [#ORD-${resultado.order.id.substring(0, 8).toUpperCase()}]`,
      entidadTipo: 'Order',
      entidadId: `#ORD-${resultado.order.id.substring(0, 8).toUpperCase()}`,
      usuarioId: seller.id,
      usuarioNombre: seller.nombre,
      usuarioEmail: seller.email,
      usuarioRol: seller.rol,
      detalles: {
        orderId: resultado.order.id,
        total,
        cliente: customer.user?.nombre || dto.clienteNombre,
        metodoPago: dto.metodoPago,
        autoDespacho,
      },
    });

    return {
      success: true,
      message: autoDespacho
        ? '¡Venta registrada y credenciales despachadas exitosamente!'
        : '¡Orden de venta creada como pendiente!',
      orderId: resultado.order.id,
      estado: resultado.order.estado,
      total,
      vendedor: {
        nombre: seller.nombre,
        comision: comisionMonto,
        porcentaje: `${porcentajeAplicado}%`,
      },
      cliente: {
        nombre: customer.user?.nombre || dto.clienteNombre,
        email: customer.user?.email || dto.clienteEmail,
        whatsapp: customer.whatsapp,
      },
      suscripciones: resultado.suscripciones.map((s) => ({
        id: s.id,
        accountId: s.accountId || s.account?.id,
        accountCode: (s.accountId || s.account?.id) ? `#ACC-${(s.accountId || s.account?.id).substring(0, 8).toUpperCase()}` : null,
        servicio: s.plan.service.nombre,
        plan: s.plan.nombrePlan,
        emailCuenta: s.account.emailCuenta,
        passwordCuenta: s.account.passwordCuenta,
        perfilAsignado: s.account.perfilAsignado,
        pinPerfil: s.account.pinPerfil,
        fechaVencimiento: s.fechaVencimiento,
      })),
    };
  }

  // APROBAR PAGO Y ENTREGAR CUENTAS
  async approveAndDeliver(
    orderId: string,
    currentUser?: any,
    assignedVendedorId?: string,
    comprobanteUrl?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { plan: true } },
        customer: { include: { user: true } },
        vendedor: { include: { affiliate: true } },
      },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.estado === OrderStatus.PAGADO) {
      throw new BadRequestException('Esta orden ya fue pagada y entregada');
    }

    // Regla estricta de comprobante:
    // Si el pago NO fue en efectivo, se requiere obligatoriamente una imagen de soporte
    const isEfectivo = (order.metodoPago || '').toLowerCase().includes('efectivo');
    const finalComprobante = (comprobanteUrl && comprobanteUrl.trim()) || order.comprobanteUrl;

    if (!isEfectivo && !finalComprobante) {
      throw new BadRequestException(
        'Para órdenes pagadas con medios electrónicos (Nequi, Bancolombia, Daviplata, Bre-B, Tarjeta, PSE, Transferencia) es obligatorio adjuntar una imagen de soporte/comprobante antes de aprobar y despachar.',
      );
    }

    // Si la orden es una RENOVACIÓN, ejecutar la extensión de la suscripción en lugar de consumir stock nuevo
    if (order.descripcionVenta?.includes('[RENOVACIÓN]')) {
      return this.approveRenewal(orderId, currentUser, finalComprobante);
    }

    // Determinar vendedor responsable (ventas del portal se asignan al vendedor o asesor que las procese)
    let sellerUserId = assignedVendedorId || order.vendedorId;
    if (!sellerUserId && (currentUser?.rol === UserRole.VENDEDOR || currentUser?.rol === UserRole.ASESOR_COMERCIAL)) {
      sellerUserId = currentUser.userId || currentUser.id;
    }

    let sellerUser: any = null;
    let sellerAffiliate: any = null;
    let comisionMonto = 0;
    let porcentajeAplicado = 0;

    if (sellerUserId) {
      sellerUser = await this.prisma.user.findUnique({
        where: { id: sellerUserId },
        include: { affiliate: true },
      });
      if (sellerUser && !sellerUser.affiliate) {
        const uniqueCode = `${sellerUser.nombre.substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
        sellerAffiliate = await this.prisma.affiliate.create({
          data: {
            userId: sellerUser.id,
            codigoReferido: uniqueCode,
          },
        });
        sellerUser.affiliate = sellerAffiliate;
      } else if (sellerUser?.affiliate) {
        sellerAffiliate = sellerUser.affiliate;
      }

      if (sellerAffiliate) {
        const rangoKey = (sellerAffiliate.rango || 'bronce').toLowerCase();
        const rate = this.COMMISSION_RATES[rangoKey] || 0.15;
        porcentajeAplicado = rate * 100;
        comisionMonto = Math.round(Number(order.total) * rate);
      }
    }

    const fechaHoraAprobacion = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const descripcionFinal = sellerUser
      ? `Venta realizada por: ${sellerUser.nombre} | Fecha y Hora: ${fechaHoraAprobacion} | Ganancia Vendedor: $${comisionMonto.toLocaleString('es-CO')} (${porcentajeAplicado}%)`
      : `Venta directa por plataforma web | Fecha y Hora: ${fechaHoraAprobacion}`;

    // Transacción: Marcar como pagada + asignar cuentas + crear suscripciones + asignar comisiones
    const suscripcionesCreadas = await this.prisma.$transaction(async (tx) => {
      // 1. Actualizar estado, soporte de comprobante y descripción de la orden
      await tx.order.update({
        where: { id: orderId },
        data: {
          estado: OrderStatus.PAGADO,
          ...(finalComprobante && {
            comprobanteUrl: finalComprobante,
            comprobanteVerificado: true,
            comprobanteVerificadoAt: new Date(),
            comprobanteVerificadoPor: currentUser?.nombre || currentUser?.email || 'Sistema',
          }),
          ...(sellerUser && {
            vendedorId: sellerUser.id,
            vendedorNombre: sellerUser.nombre,
            vendedorPorcentaje: porcentajeAplicado,
            vendedorComision: comisionMonto,
          }),
          descripcionVenta: descripcionFinal,
        },
      });

      // 2. Acreditar comisión al afiliado si corresponde
      if (sellerAffiliate && comisionMonto > 0) {
        await tx.affiliate.update({
          where: { id: sellerAffiliate.id },
          data: {
            walletBalance: { increment: comisionMonto },
          },
        });

        await tx.commission.create({
          data: {
            affiliateId: sellerAffiliate.id,
            orderId: order.id,
            tipo: 'directa',
            porcentaje: porcentajeAplicado / 100,
            montoComision: comisionMonto,
            estado: 'disponible',
          },
        });
      }

      const suscripciones = [];
      let costoAcumulado = 0;

      // 3. Para cada item, buscar cuenta disponible y crear suscripción
      for (const item of order.items) {
        for (let i = 0; i < item.cantidad; i++) {
          // Buscar cuenta previamente reservada con TTL para este cliente o disponible (FIFO)
          let account = await tx.account.findFirst({
            where: {
              planId: item.planId,
              reservedByCustomerId: order.customerId,
              estado: AccountStatus.PENDIENTE_PAGO,
            },
            include: { rootAccount: true },
            orderBy: { createdAt: 'asc' },
          });

          if (!account) {
            account = await tx.account.findFirst({
              where: { planId: item.planId, estado: AccountStatus.DISPONIBLE },
              include: { rootAccount: true },
              orderBy: { createdAt: 'asc' },
            });
          }

          if (!account) {
            throw new BadRequestException(`Stock agotado durante la entrega para ${item.plan.nombrePlan}`);
          }

          // Calcular fecha de vencimiento: si es upgrade prorrateado (Escenario 12), sincronizar con la orden padre
          let fechaVencimiento = new Date();
          let parentSubId: string | null = null;
          if (order.esProrrateo && order.parentOrderId) {
            const parentSub = await tx.subscription.findFirst({
              where: { orderId: order.parentOrderId, estado: SubscriptionStatus.ACTIVA },
            });
            if (parentSub) {
              fechaVencimiento = new Date(parentSub.fechaVencimiento);
              parentSubId = parentSub.id;
            } else {
              fechaVencimiento.setDate(fechaVencimiento.getDate() + item.plan.duracionDias);
            }
          } else {
            fechaVencimiento.setDate(fechaVencimiento.getDate() + item.plan.duracionDias);
          }

          let costoPerfil = 0;
          if (account.rootAccount) {
            const maxP = account.rootAccount.maxPerfiles || 5;
            costoPerfil = account.rootAccount.costoCompra ? Number(account.rootAccount.costoCompra) / maxP : Number(account.costoCompra || 0);
          } else {
            costoPerfil = Number(account.costoCompra || 0);
          }
          const ganancia = Math.max(0, Number(item.plan.precio) - costoPerfil);
          costoAcumulado += costoPerfil;

          // Crear suscripción con campos de trazabilidad SGVS
          const subscription = await tx.subscription.create({
            data: {
              customerId: order.customerId,
              planId: item.planId,
              accountId: account.id,
              orderId: order.id,
              parentSubscriptionId: parentSubId,
              clase: order.clase || 'NUEVA',
              costoPerfil,
              ganancia,
              fechaUltimoCambioClave: new Date(),
              estadoLibre: 'VENDIDA',
              fechaVencimiento,
              estado: 'ACTIVA',
            },
            include: {
              account: true,
              plan: { include: { service: true } },
            },
          });

          // Marcar cuenta como ocupada y limpiar reserva TTL
          await tx.account.update({
            where: { id: account.id },
            data: {
              estado: AccountStatus.OCUPADA,
              reservedUntil: null,
              reservedByCustomerId: null,
            },
          });

          suscripciones.push(subscription);
        }
      }

      // Actualizar costos y ganancia neta en la orden
      const gananciaNeta = Number(order.total) - costoAcumulado - (comisionMonto || 0);
      await tx.order.update({
        where: { id: orderId },
        data: {
          costoTotal: costoAcumulado,
          gananciaNeta,
        },
      });

      return suscripciones;
    });

    // 4. Enviar mensaje de entrega por WhatsApp (fuera de la transacción)
    try {
      await this.whatsappService.sendDeliveryMessage(
        order.customer.whatsapp,
        order.customer.user.nombre,
        suscripcionesCreadas,
      );
    } catch (error) {
      console.error('Error enviando WhatsApp de entrega:', error);
    }

    await this.auditService.registrarEvento({
      accion: 'APROBACION_VENTA',
      modulo: AuditCategory.VENTAS,
      severidad: AuditSeverity.SUCCESS,
      descripcion: `Orden [#ORD-${order.id.substring(0, 8).toUpperCase()}] aprobada y cuentas despachadas. Venta gestionada por: ${sellerUser?.nombre || currentUser?.nombre || 'Plataforma'} ($${Number(order.total).toLocaleString('es-CO')})`,
      entidadTipo: 'Order',
      entidadId: `#ORD-${order.id.substring(0, 8).toUpperCase()}`,
      usuarioId: currentUser?.userId || currentUser?.id,
      usuarioNombre: currentUser?.nombre,
      usuarioEmail: currentUser?.email,
      usuarioRol: currentUser?.rol,
      detalles: {
        orderId: order.id,
        total: order.total,
        vendedor: sellerUser?.nombre,
        suscripcionesActivadas: suscripcionesCreadas.length,
      },
    });

    return {
      message: 'Pago aprobado y cuentas entregadas exitosamente',
      descripcionVenta: descripcionFinal,
      vendedor: sellerUser ? {
        nombre: sellerUser.nombre,
        comision: comisionMonto,
        porcentaje: `${porcentajeAplicado}%`,
      } : null,
      suscripciones: suscripcionesCreadas.map(s => ({
        id: s.id,
        accountId: s.accountId || s.account.id,
        accountCode: (s.accountId || s.account.id) ? `#ACC-${(s.accountId || s.account.id).substring(0, 8).toUpperCase()}` : null,
        servicio: s.plan.service.nombre,
        plan: s.plan.nombrePlan,
        email: s.account.emailCuenta,
        password: s.account.passwordCuenta,
        perfil: s.account.perfilAsignado,
        pin: s.account.pinPerfil,
        venceEl: s.fechaVencimiento,
      })),
    };
  }

  // ADJUNTAR O ACTUALIZAR COMPROBANTE DE PAGO ASOCIADO ÚNICAMENTE A ESTA ORDEN (SIN APROBAR)
  async attachReceipt(orderId: string, comprobanteUrl: string, currentUser?: any) {
    if (!comprobanteUrl || !comprobanteUrl.trim()) {
      throw new BadRequestException('La imagen del soporte/comprobante de pago es obligatoria.');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { include: { user: true } } },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    if (order.estado === OrderStatus.CANCELADO) {
      throw new BadRequestException('Esta orden ha sido cancelada. No se pueden realizar más acciones ni adjuntar comprobantes.');
    }

    // Si el comprobante ya fue verificado por el personal, NO se permite adjuntar uno nuevo (Modo sólo lectura)
    if (order.comprobanteVerificado) {
      throw new ForbiddenException(
        'El comprobante de pago de esta orden ya ha sido verificado. No se permite adjuntar un nuevo comprobante ni modificar el existente (modo de solo lectura).',
      );
    }

    if (currentUser && currentUser.rol === UserRole.CLIENTE) {
      const isOwner =
        (currentUser.customerId && order.customerId === currentUser.customerId) ||
        (order.customer?.userId && (order.customer.userId === currentUser.id || order.customer.userId === currentUser.userId));
      if (!isOwner) {
        throw new ForbiddenException('No tienes permisos para modificar el comprobante de esta orden.');
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { comprobanteUrl: comprobanteUrl.trim() },
      select: {
        id: true,
        comprobanteUrl: true,
        comprobanteVerificado: true,
        comprobanteVerificadoAt: true,
        comprobanteVerificadoPor: true,
        estado: true,
        metodoPago: true,
        total: true,
      },
    });

    try {
      await this.auditService.registrarEvento({
        accion: 'COMPROBANTE_PAGO_ADJUNTADO',
        modulo: AuditCategory.VENTAS,
        severidad: AuditSeverity.INFO,
        descripcion: `Comprobante de pago adjuntado para la orden [#ORD-${order.id.substring(0, 8).toUpperCase()}]. Estado: PENDIENTE (espera de revisión por personal autorizado).`,
        entidadTipo: 'Order',
        entidadId: `#ORD-${order.id.substring(0, 8).toUpperCase()}`,
        usuarioId: currentUser?.userId || currentUser?.id || order.customer?.userId,
        usuarioNombre: currentUser?.nombre || order.customer?.user?.nombre,
        usuarioEmail: currentUser?.email || order.customer?.user?.email,
        usuarioRol: currentUser?.rol || 'CLIENTE',
        detalles: {
          orderId: order.id,
          comprobanteAdjuntado: true,
          estado: order.estado,
        },
      });
    } catch (auditErr) {
      console.error('Error registrando auditoría de comprobante:', auditErr);
    }

    return {
      message: 'Comprobante de pago adjuntado exitosamente. La orden queda pendiente de verificación.',
      order: updated,
    };
  }

  // VERIFICAR COMPROBANTE DE PAGO EN ÓRDENES Y VENTAS (ADMIN, VENDEDOR, SOPORTE)
  async verifyReceipt(orderId: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { include: { user: true } },
        items: { include: { plan: { include: { service: true } } } },
      },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');

    if (!order.comprobanteUrl) {
      throw new BadRequestException('Esta orden no posee un comprobante de pago adjunto para verificar.');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        comprobanteVerificado: true,
        comprobanteVerificadoAt: new Date(),
        comprobanteVerificadoPor: currentUser?.nombre || currentUser?.email || 'Personal Autorizado',
      },
      include: {
        customer: { include: { user: true } },
        items: { include: { plan: { include: { service: true } } } },
        subscriptions: { include: { account: true } },
        vendedor: true,
      },
    });

    try {
      await this.auditService.registrarEvento({
        accion: 'VERIFICACION_COMPROBANTE',
        modulo: AuditCategory.VENTAS,
        severidad: AuditSeverity.SUCCESS,
        descripcion: `Comprobante de pago verificado para la orden [#ORD-${order.id.substring(0, 8).toUpperCase()}] por ${currentUser?.nombre || currentUser?.email} (${currentUser?.rol}). El comprobante queda bloqueado en solo lectura.`,
        entidadTipo: 'Order',
        entidadId: `#ORD-${order.id.substring(0, 8).toUpperCase()}`,
        usuarioId: currentUser?.userId || currentUser?.id,
        usuarioNombre: currentUser?.nombre,
        usuarioEmail: currentUser?.email,
        usuarioRol: currentUser?.rol,
        detalles: {
          orderId: order.id,
          comprobanteUrl: order.comprobanteUrl,
          verificadoPor: currentUser?.nombre || currentUser?.email,
        },
      });
    } catch (auditErr) {
      console.error('Error registrando auditoría de verificación:', auditErr);
    }

    return {
      message: 'Comprobante verificado con éxito. Ha quedado establecido como comprobante verificado en solo lectura.',
      order: updated,
    };
  }

  // LISTAR ÓRDENES DEL CLIENTE
  async getCustomerOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: { include: { plan: { include: { service: true } } } },
        vendedor: { select: { id: true, nombre: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // LISTAR TODAS LAS ÓRDENES (Admin, Vendedor, Soporte, Asesor Comercial)
  async getAllOrders(filters: {
    estado?: OrderStatus;
    customerId?: string;
    fecha?: string;
    vendedor?: string;
  }, currentUser?: any) {
    const where: any = {};
    if (filters.estado) where.estado = filters.estado;
    if (filters.customerId) where.customerId = filters.customerId;

    // Aislamiento estricto de ventas: Vendedores y Asesores Comerciales SOLO ven sus propias ventas
    if (currentUser && (currentUser.rol === UserRole.VENDEDOR || currentUser.rol === UserRole.ASESOR_COMERCIAL)) {
      where.vendedorId = currentUser.userId || currentUser.id;
    } else if (filters.vendedor) {
      if (filters.vendedor === 'directa') {
        where.vendedorNombre = null;
      } else {
        where.OR = [
          { vendedorNombre: filters.vendedor },
          { vendedor: { nombre: filters.vendedor } },
        ];
      }
    }

    if (filters.fecha) {
      const [y, m, d] = filters.fecha.split('-').map(Number);
      const startDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const endDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      where.createdAt = { gte: startDay, lte: endDay };
    }

    return this.prisma.order.findMany({
      where,
      include: {
        customer: { include: { user: { select: { nombre: true, email: true, phone: true } } } },
        vendedor: { select: { id: true, nombre: true, email: true, phone: true } },
        items: { include: { plan: { include: { service: true } } } },
        subscriptions: {
          include: {
            account: true,
            plan: { include: { service: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // DETALLE DE UNA ORDEN
  async getOrderById(orderId: string, currentUser?: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { include: { user: true } },
        vendedor: { select: { id: true, nombre: true, email: true, phone: true } },
        items: { include: { plan: { include: { service: true } } } },
        subscriptions: {
          include: {
            account: true,
            plan: { include: { service: true } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');

    // Aislamiento: Vendedor o Asesor Comercial solo puede ver su propia orden
    if (currentUser && (currentUser.rol === UserRole.VENDEDOR || currentUser.rol === UserRole.ASESOR_COMERCIAL)) {
      const myId = currentUser.userId || currentUser.id;
      if (order.vendedorId !== myId) {
        throw new ForbiddenException('No tienes permisos para ver esta orden');
      }
    }

    return order;
  }

  // REEMBOLSAR ORDEN
  async refundOrder(orderId: string, adminId: string, motivo?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { plan: { include: { service: true } } } },
        customer: { include: { user: true } },
        subscriptions: { include: { account: true } },
        commissions: true,
      },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.estado === OrderStatus.REEMBOLSADO) {
      throw new BadRequestException('Esta orden ya fue reembolsada');
    }
    if (order.estado !== OrderStatus.PAGADO) {
      throw new BadRequestException('Solo se pueden reembolsar órdenes con estado PAGADO');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Cambiar estado de la orden a REEMBOLSADO
      await tx.order.update({
        where: { id: orderId },
        data: {
          estado: OrderStatus.REEMBOLSADO,
          descripcionVenta: `${order.descripcionVenta || ''} | REEMBOLSADO por Admin (${adminId}). Motivo: ${motivo || 'No especificado'}`,
        },
      });

      // 2. Cancelar suscripciones asociadas y liberar cuentas
      for (const sub of order.subscriptions) {
        // Cancelar suscripción
        await tx.subscription.update({
          where: { id: sub.id },
          data: { estado: SubscriptionStatus.CANCELADA },
        });

        // Liberar cuenta al inventario
        if (sub.account) {
          await tx.account.update({
            where: { id: sub.account.id },
            data: { estado: AccountStatus.DISPONIBLE },
          });
        }
      }

      // 3. Revertir comisiones del vendedor
      for (const commission of order.commissions) {
        // Descontar de la wallet del afiliado
        await tx.affiliate.update({
          where: { id: commission.affiliateId },
          data: {
            walletBalance: { decrement: commission.montoComision.toNumber() },
          },
        });

        // Marcar comisión como revertida
        await tx.commission.update({
          where: { id: commission.id },
          data: { estado: 'revertida' },
        });
      }
    });

    // 4. Notificar al cliente por WhatsApp (fuera de transacción)
    try {
      await this.whatsappService.sendTextMessage(
        order.customer.whatsapp,
        `Hola ${order.customer.user.nombre}, tu orden ha sido reembolsada exitosamente.\n\nMotivo: ${motivo || 'Solicitud del cliente'}\nMonto: $${Number(order.total).toLocaleString('es-CO')}\n\nSi tienes dudas, respónde este mensaje. ¡Gracias por tu comprensión! 🙏`,
        true,
      );
    } catch (error) {
      console.error('Error enviando WhatsApp de reembolso:', error);
    }

    await this.auditService.registrarEvento({
      accion: 'REEMBOLSO_ORDEN',
      modulo: AuditCategory.VENTAS,
      severidad: AuditSeverity.WARNING,
      descripcion: `Orden [#ORD-${order.id.substring(0, 8).toUpperCase()}] reembolsada por administrador. Monto: $${Number(order.total).toLocaleString('es-CO')}. Motivo: ${motivo || 'Solicitud de cliente'}`,
      entidadTipo: 'Order',
      entidadId: `#ORD-${order.id.substring(0, 8).toUpperCase()}`,
      usuarioId: adminId,
      detalles: {
        orderId,
        montoReembolsado: Number(order.total),
        motivo,
        suscripcionesCanceladas: order.subscriptions.length,
      },
    });

    return {
      message: 'Orden reembolsada exitosamente',
      orderId,
      montoReembolsado: Number(order.total),
      suscripcionesCanceladas: order.subscriptions.length,
      comisionesRevertidas: order.commissions.length,
    };
  }

  // CANCELAR VENTA Y DEVOLVER CUENTAS AL INVENTARIO
  async cancelSale(
    orderId: string,
    currentUser: any,
    motivo?: string,
    accountIdsToRestore?: string[],
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { plan: { include: { service: true } } } },
        customer: { include: { user: true } },
        subscriptions: {
          include: {
            account: true,
            plan: { include: { service: true } },
          },
        },
        commissions: true,
        vendedor: true,
      },
    });

    if (!order) throw new NotFoundException('Orden o venta no encontrada');

    if (order.estado === OrderStatus.CANCELADO) {
      throw new BadRequestException('Esta venta u orden ya ha sido cancelada previamente');
    }

    // Aislamiento: Vendedor o Asesor Comercial solo puede cancelar sus propias ventas
    if (currentUser && (currentUser.rol === UserRole.VENDEDOR || currentUser.rol === UserRole.ASESOR_COMERCIAL)) {
      const myId = currentUser.userId || currentUser.id;
      if (order.vendedorId !== myId) {
        throw new ForbiddenException('Solo puedes anular o cancelar tus propias ventas.');
      }
    }

    const restoredAccounts: Array<{
      id: string;
      codigo: string;
      email: string;
      servicio: string;
      plan: string;
      estadoFinal: string;
    }> = [];

    // ESCENARIO 1: Factor de seguridad - ¿Fueron vistas las credenciales?
    const credencialesVistas = order.credencialesVistas || order.subscriptions.some((s) => s.credencialesVistas);
    let estadoDestinoCuenta: AccountStatus = AccountStatus.DISPONIBLE;
    let reembolsoWallet = 0;

    await this.prisma.$transaction(async (tx) => {
      // Si las credenciales NO fueron vistas: devolver a DISPONIBLE y reembolsar a la billetera (wallet) del cliente
      if (!credencialesVistas) {
        estadoDestinoCuenta = AccountStatus.DISPONIBLE;
        reembolsoWallet = Number(order.total);
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            walletBalance: { increment: order.total },
          },
        });
      } else {
        // Si las credenciales SÍ fueron vistas: mover a CUARENTENA y exigir cambio de contraseña raíz antes de devolverlo a disponible
        estadoDestinoCuenta = AccountStatus.CUARENTENA;
      }

      // 1. Cambiar estado de la orden a CANCELADO y registrar motivo y notas de seguridad
      const securityNote = !credencialesVistas
        ? `[SEGURIDAD: Credenciales NO vistas. Saldo de $${reembolsoWallet.toLocaleString('es-CO')} reembolsado a la billetera del cliente]`
        : `[SEGURIDAD: Credenciales SÍ vistas por el cliente. Perfil puesto en CUARENTENA hasta rotación de contraseña raíz]`;

      const cancelNote = `[VENTA CANCELADA - ${new Date().toLocaleString('es-CO')} por ${currentUser?.nombre || currentUser?.email || 'Usuario'}]: ${motivo || 'Cancelación de venta'} | ${securityNote}`;
      await tx.order.update({
        where: { id: orderId },
        data: {
          estado: OrderStatus.CANCELADO,
          descripcionVenta: order.descripcionVenta
            ? `${order.descripcionVenta} | ${cancelNote}`
            : cancelNote,
        },
      });

      // 2. Procesar suscripciones y perfiles según el factor de seguridad
      for (const sub of order.subscriptions) {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { estado: SubscriptionStatus.CANCELADA },
        });

        const shouldRestore = Array.isArray(accountIdsToRestore)
          ? accountIdsToRestore.includes(sub.accountId) || (sub.account && accountIdsToRestore.includes(sub.account.id))
          : true;

        if (shouldRestore && sub.account) {
          await tx.account.update({
            where: { id: sub.account.id },
            data: { estado: estadoDestinoCuenta },
          });

          // Si pasó a cuarentena y tiene cuenta raíz vinculada, marcar alerta de cambio de contraseña
          if (estadoDestinoCuenta === AccountStatus.CUARENTENA && sub.account.rootAccountId) {
            await tx.rootAccount.update({
              where: { id: sub.account.rootAccountId },
              data: { requiresPasswordChange: true },
            }).catch(() => {});
          }

          restoredAccounts.push({
            id: sub.account.id,
            codigo: `#ACC-${sub.account.id.substring(0, 8).toUpperCase()}`,
            email: sub.account.emailCuenta,
            servicio: sub.plan?.service?.nombre || 'Streaming',
            plan: sub.plan?.nombrePlan || 'Plan',
            estadoFinal: estadoDestinoCuenta,
          });
        }
      }

      // 3. Revertir comisiones del vendedor si la orden tenía comisiones liquidadas
      for (const commission of order.commissions) {
        if (commission.estado !== 'cancelada' && commission.estado !== 'revertida') {
          await tx.affiliate.update({
            where: { id: commission.affiliateId },
            data: {
              walletBalance: { decrement: commission.montoComision.toNumber() },
            },
          });

          await tx.commission.update({
            where: { id: commission.id },
            data: { estado: 'cancelada' },
          });
        }
      }
    });

    // 4. Intentar notificar al cliente por WhatsApp (fuera de la transacción)
    try {
      if (order.customer?.whatsapp) {
        const orderCode = `#ORD-${order.id.substring(0, 8).toUpperCase()}`;
        const mensajeWa = `Hola ${order.customer.user?.nombre || 'Cliente'},\n\nTe informamos que tu orden de compra ${orderCode} ha sido CANCELADA.\n\nMotivo: ${motivo || 'Cancelación de venta'}\nTotal: $${Number(order.total).toLocaleString('es-CO')}\n\nSi tienes inquietudes o deseas solicitar otro servicio, por favor contáctanos respondiendo a este mensaje. ¡Estamos para ayudarte! 🙏`;
        await this.whatsappService.sendTextMessage(order.customer.whatsapp, mensajeWa, true);
      }
    } catch (err) {
      console.error('Error enviando notificación WhatsApp de cancelación:', err);
    }

    // 5. Registrar en el Módulo de Auditoría
    const orderCode = `#ORD-${order.id.substring(0, 8).toUpperCase()}`;
    await this.auditService.registrarEvento({
      accion: 'CANCELACION_VENTA',
      modulo: AuditCategory.VENTAS,
      severidad: AuditSeverity.WARNING,
      descripcion: `Venta cancelada [${orderCode}]. Monto: $${Number(order.total).toLocaleString('es-CO')}. Cuentas devueltas al inventario: ${restoredAccounts.length}. Motivo: ${motivo || 'No especificado'}.`,
      entidadTipo: 'Order',
      entidadId: orderCode,
      usuarioId: currentUser?.userId || currentUser?.id,
      detalles: {
        orderId,
        total: Number(order.total),
        motivo: motivo || 'Cancelación de venta',
        cliente: {
          id: order.customer?.id,
          nombre: order.customer?.user?.nombre,
          email: order.customer?.user?.email,
          whatsapp: order.customer?.whatsapp,
        },
        cuentasDevueltas: restoredAccounts,
        totalCuentasDevueltas: restoredAccounts.length,
        suscripcionesCanceladas: order.subscriptions.length,
        comisionesRevertidas: order.commissions.length,
        canceladoPor: {
          id: currentUser?.userId || currentUser?.id,
          nombre: currentUser?.nombre,
          email: currentUser?.email,
          rol: currentUser?.rol,
        },
      },
    });

    return {
      success: true,
      message: 'Venta cancelada exitosamente y cuentas seleccionadas devueltas al inventario como disponibles',
      orderId,
      estado: OrderStatus.CANCELADO,
      cuentasDevueltas: restoredAccounts,
      totalDevueltas: restoredAccounts.length,
      suscripcionesCanceladas: order.subscriptions.length,
    };
  }

  // OBTENER TODAS LAS RENOVACIONES
  async getRenewals(filters?: { estado?: OrderStatus; search?: string; fecha?: string }) {
    const where: any = {
      descripcionVenta: { contains: '[RENOVACIÓN]' },
    };

    if (filters?.estado) where.estado = filters.estado;
    if (filters?.fecha) {
      const [y, m, d] = filters.fecha.split('-').map(Number);
      const startDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const endDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      where.createdAt = { gte: startDay, lte: endDay };
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: { include: { user: true } },
        items: { include: { plan: { include: { service: true } } } },
        subscriptions: { include: { account: true, plan: { include: { service: true } } } },
        vendedor: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const enhanced = await Promise.all(
      orders.map(async (order) => {
        const match = order.descripcionVenta?.match(/Suscripción ID:\s*([a-f0-9-]+)/i);
        let linkedSubscription: any = null;
        if (match && match[1]) {
          linkedSubscription = await this.prisma.subscription.findUnique({
            where: { id: match[1] },
            include: {
              account: true,
              plan: { include: { service: true } },
            },
          });
        }

        if (!linkedSubscription && order.subscriptions && order.subscriptions.length > 0) {
          linkedSubscription = order.subscriptions[0];
        }

        return {
          ...order,
          esRenovacion: true,
          linkedSubscription,
        };
      }),
    );

    return enhanced;
  }

  // APROBAR RENOVACIÓN DE SUSCRIPCIÓN (Extender vigencia sin gastar stock)
  async approveRenewal(
    orderId: string,
    currentUser: any,
    comprobanteUrl?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { plan: { include: { service: true } } } },
        customer: { include: { user: true } },
        vendedor: { include: { affiliate: true } },
      },
    });

    if (!order) throw new NotFoundException('Orden de renovación no encontrada');
    if (order.estado === OrderStatus.PAGADO) {
      throw new BadRequestException('Esta renovación ya fue aprobada y procesada');
    }

    const finalComprobante = (comprobanteUrl && comprobanteUrl.trim()) || order.comprobanteUrl;

    if (!finalComprobante || !finalComprobante.trim()) {
      throw new BadRequestException(
        'Es obligatorio adjuntar y verificar el comprobante de pago para poder aprobar la renovación.',
      );
    }

    // Extraer ID de la suscripción original desde descripcionVenta
    const match = order.descripcionVenta?.match(/Suscripción ID:\s*([a-f0-9-]+)/i);
    let subscription: any = null;

    if (match && match[1]) {
      subscription = await this.prisma.subscription.findUnique({
        where: { id: match[1] },
        include: {
          account: true,
          plan: { include: { service: true } },
        },
      });
    }

    // Si no se encontró por ID directo, buscar por customerId y planId
    if (!subscription && order.items[0]?.planId) {
      subscription = await this.prisma.subscription.findFirst({
        where: {
          customerId: order.customerId,
          planId: order.items[0].planId,
        },
        include: {
          account: true,
          plan: { include: { service: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!subscription) {
      throw new NotFoundException('No se encontró la suscripción original a renovar');
    }

    const planDuration = order.items[0]?.plan?.duracionDias || subscription.plan?.duracionDias || 30;
    const now = new Date();
    // Si la suscripción aún está vigente, extender desde fechaVencimiento; si ya venció, extender desde hoy
    const baseDate = new Date(subscription.fechaVencimiento) > now
      ? new Date(subscription.fechaVencimiento)
      : now;
    const nuevaFechaVencimiento = new Date(baseDate.getTime() + planDuration * 24 * 60 * 60 * 1000);

    const fechaHoraAprobacion = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const descRenovacion = `${order.descripcionVenta || 'Renovación'} | APROBADA por ${currentUser?.nombre || currentUser?.email || 'Admin'} el ${fechaHoraAprobacion} | Nueva vigencia: ${nuevaFechaVencimiento.toLocaleDateString('es-CO')}`;

    await this.prisma.$transaction(async (tx) => {
      // 1. Marcar orden como PAGADO
      await tx.order.update({
        where: { id: orderId },
        data: {
          estado: OrderStatus.PAGADO,
          ...(finalComprobante && {
            comprobanteUrl: finalComprobante,
            comprobanteVerificado: true,
            comprobanteVerificadoAt: new Date(),
            comprobanteVerificadoPor: currentUser?.nombre || currentUser?.email || 'Sistema',
          }),
          descripcionVenta: descRenovacion,
        },
      });

      // 2. Extender vigencia de la suscripción existente y marcarla ACTIVA
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          fechaVencimiento: nuevaFechaVencimiento,
          estado: SubscriptionStatus.ACTIVA,
        },
      });

      // 3. Asegurar que la cuenta asignada continúe en estado OCUPADA
      if (subscription.accountId) {
        await tx.account.update({
          where: { id: subscription.accountId },
          data: { estado: AccountStatus.OCUPADA },
        });
      }
    });

    // 4. Registrar en Auditoría
    const orderCode = `#ORD-${order.id.substring(0, 8).toUpperCase()}`;
    const accCode = subscription.accountId ? `#ACC-${subscription.accountId.substring(0, 8).toUpperCase()}` : 'N/A';
    await this.auditService.registrarEvento({
      accion: 'RENOVACION_APROBADA',
      modulo: AuditCategory.VENTAS,
      severidad: AuditSeverity.INFO,
      descripcion: `Renovación aprobada [${orderCode}] para cuenta [${accCode}]. Vigencia extendida hasta ${nuevaFechaVencimiento.toLocaleDateString('es-CO')}. Monto: $${Number(order.total).toLocaleString('es-CO')}.`,
      entidadTipo: 'Subscription',
      entidadId: accCode,
      usuarioId: currentUser?.userId || currentUser?.id,
      detalles: {
        orderId,
        subscriptionId: subscription.id,
        cuentaId: subscription.accountId,
        emailCuenta: subscription.account?.emailCuenta,
        vencimientoAnterior: subscription.fechaVencimiento,
        nuevoVencimiento: nuevaFechaVencimiento,
        total: Number(order.total),
        cliente: order.customer?.user?.nombre,
      },
    });

    // 5. Notificar al cliente por WhatsApp
    try {
      if (order.customer?.whatsapp) {
        const mensajeWa = `¡Hola ${order.customer.user?.nombre || 'Cliente'}! 🎉\n\nTu renovación para *${subscription.plan?.service?.nombre || 'Streaming'} (${subscription.plan?.nombrePlan})* ha sido APROBADA exitosamente.\n\n📅 *Nuevo vencimiento:* ${nuevaFechaVencimiento.toLocaleDateString('es-CO')}\n🔑 *Tus credenciales de acceso se mantienen iguales:*\nCorreo: ${subscription.account?.emailCuenta || 'N/A'}\nPerfil: ${subscription.account?.perfilAsignado || 'Principal'}\n\n¡Gracias por tu confianza y preferencia! 🙏`;
        await this.whatsappService.sendTextMessage(order.customer.whatsapp, mensajeWa, true);
      }
    } catch (err) {
      console.error('Error enviando WhatsApp de renovación:', err);
    }

    return {
      message: 'Renovación aprobada exitosamente y vigencia extendida',
      orderId,
      subscriptionId: subscription.id,
      nuevaFechaVencimiento,
      suscripciones: [
        {
          id: subscription.id,
          accountId: subscription.accountId || subscription.account?.id,
          accountCode: (subscription.accountId || subscription.account?.id) ? `#ACC-${(subscription.accountId || subscription.account?.id).substring(0, 8).toUpperCase()}` : null,
          servicio: subscription.plan?.service?.nombre,
          plan: subscription.plan?.nombrePlan,
          email: subscription.account?.emailCuenta,
          perfil: subscription.account?.perfilAsignado,
          pin: subscription.account?.pinPerfil,
          fechaVencimiento: nuevaFechaVencimiento,
        },
      ],
    };
  }

  // =========================================================================
  // ESCENARIO 12: UPGRADE DE PANTALLA ADICIONAL CON PRORRATEO
  // =========================================================================
  async createProratedUpgrade(
    customerId: string,
    parentSubscriptionId: string,
    planId: string,
    dto: { metodoPago?: string; comprobanteUrl?: string },
  ) {
    const parentSub = await this.prisma.subscription.findFirst({
      where: { id: parentSubscriptionId, customerId },
      include: { plan: { include: { service: true } }, order: true },
    });

    if (!parentSub) throw new NotFoundException('Suscripción principal no encontrada');

    const now = new Date();
    const vencimiento = new Date(parentSub.fechaVencimiento);
    const diasRestantes = Math.max(1, Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: { service: true },
    });
    if (!newPlan) throw new NotFoundException('Plan para pantalla adicional no encontrado');

    // Cálculo prorrateado: (Precio_Mes / 30) * Días_Restantes
    const precioBase = Number(newPlan.precio);
    const precioProrrateado = Math.round((precioBase / 30) * diasRestantes);

    return this.prisma.$transaction(async (tx) => {
      // 1. Reservar cuenta disponible
      const availableAccount = await tx.account.findFirst({
        where: { planId, estado: AccountStatus.DISPONIBLE },
        orderBy: { createdAt: 'asc' },
      });
      if (!availableAccount) {
        throw new BadRequestException('No hay pantallas disponibles en este momento para agregar a tu suscripción.');
      }

      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await tx.account.update({
        where: { id: availableAccount.id },
        data: {
          estado: AccountStatus.PENDIENTE_PAGO,
          reservedUntil,
          reservedByCustomerId: customerId,
        },
      });

      // 2. Crear orden de upgrade prorrateada
      const upgradeOrder = await tx.order.create({
        data: {
          customerId,
          parentOrderId: parentSub.orderId,
          esProrrateo: true,
          total: precioProrrateado,
          estado: OrderStatus.PENDIENTE,
          metodoPago: dto.metodoPago,
          comprobanteUrl: dto.comprobanteUrl,
          descripcionVenta: `[UPGRADE PRORRATEADO] Pantalla adicional sincronizada con suscripción ${parentSub.id} (${diasRestantes} días restantes hasta ${vencimiento.toLocaleDateString('es-CO')})`,
          items: {
            create: [
              {
                planId,
                cantidad: 1,
                precioUnitario: precioProrrateado,
                subtotal: precioProrrateado,
              },
            ],
          },
        },
        include: { items: true, customer: { include: { user: true } } },
      });

      return {
        message: 'Orden de pantalla adicional creada con cálculo prorrateado exitosamente.',
        order: upgradeOrder,
        diasRestantes,
        precioProrrateado,
        fechaVencimientoSincronizada: parentSub.fechaVencimiento,
      };
    });
  }
}