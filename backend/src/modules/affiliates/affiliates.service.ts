import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { RegisterAffiliateDto } from './dto/register-affiliate.dto';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';
import { OrderStatus, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  // Configuración de comisiones por rango
  private readonly COMMISSION_RATES = {
    bronce: { nivel1: 0.10, nivel2: 0.03 }, // 10% directa, 3% indirecta
    plata: { nivel1: 0.15, nivel2: 0.05 }, // 15% directa, 5% indirecta
    oro: { nivel1: 0.20, nivel2: 0.07 }, // 20% directa, 7% indirecta
    diamante: { nivel1: 0.25, nivel2: 0.10 }, // 25% directa, 10% indirecta
  };

  // Umbrales para subir de rango (ventas mensuales en USD)
  private readonly RANK_THRESHOLDS = {
    bronce: 0,
    plata: 200,
    oro: 800,
    diamante: 2000,
  };

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsappService,
  ) {}

  // ============================================
  // REGISTRO Y GESTIÓN DE AFILIADOS
  // ============================================

  // REGISTRAR NUEVO AFILIADO
  async registerAffiliate(dto: RegisterAffiliateDto) {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Verificar que el código de referido es único
    const existingAffiliate = await this.prisma.affiliate.findUnique({
      where: { codigoReferido: dto.codigoReferido },
    });
    if (existingAffiliate) {
      throw new BadRequestException('Este código de referido ya está en uso');
    }

    // Buscar al referidor (si existe)
    let referidorId: string | null = null;
    if (dto.codigoReferidor) {
      const referidor = await this.prisma.affiliate.findUnique({
        where: { codigoReferido: dto.codigoReferidor },
      });
      if (referidor) {
        referidorId = referidor.id;
      }
    }

    // Crear afiliado
    const affiliate = await this.prisma.affiliate.create({
      data: {
        userId: dto.userId,
        codigoReferido: dto.codigoReferido,
        referidoPor: referidorId,
        rango: 'bronce',
        walletBalance: 0,
      },
      include: {
        user: { select: { nombre: true, email: true } },
      },
    });

    return {
      message: 'Afiliado registrado exitosamente',
      affiliate: {
        id: affiliate.id,
        codigoReferido: affiliate.codigoReferido,
        nombre: affiliate.user.nombre,
        email: affiliate.user.email,
        rango: affiliate.rango,
        linkReferido: `https://tu-marca.com/ref/${affiliate.codigoReferido}`,
      },
    };
  }

  // CREAR AFILIADO DIRECTO DESDE ADMIN (Con usuario nuevo o existente)
  async createAffiliate(dto: {
    nombre: string;
    email: string;
    phone?: string;
    password?: string;
    codigoReferido: string;
    rango?: string;
    walletBalance?: number;
    referidoPor?: string;
  }) {
    // 1. Verificar si el código ya existe
    const existingAff = await this.prisma.affiliate.findUnique({
      where: { codigoReferido: dto.codigoReferido },
    });
    if (existingAff) throw new BadRequestException('El código de referido ya está en uso');

    // 2. Verificar o crear usuario
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { affiliate: true },
    });

    if (user?.affiliate) {
      throw new BadRequestException('Este usuario ya tiene un perfil de afiliado');
    }

    if (!user) {
      const passHash = await bcrypt.hash(dto.password || 'vendedor123', 10);
      user = await this.prisma.user.create({
        data: {
          nombre: dto.nombre.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone || null,
          passwordHash: passHash,
          rol: UserRole.VENDEDOR,
        },
        include: { affiliate: true },
      });
    } else {
      // Actualizar rol a VENDEDOR si era CLIENTE
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          rol: UserRole.VENDEDOR,
          ...(dto.nombre && { nombre: dto.nombre.trim() }),
          ...(dto.phone && { phone: dto.phone.trim() }),
        },
      });
    }

    // 3. Crear el perfil de afiliado
    const newAffiliate = await this.prisma.affiliate.create({
      data: {
        userId: user.id,
        codigoReferido: dto.codigoReferido.trim().toUpperCase(),
        rango: dto.rango || 'bronce',
        walletBalance: dto.walletBalance !== undefined ? dto.walletBalance : 0,
        referidoPor: dto.referidoPor || null,
      },
      include: {
        user: { select: { id: true, nombre: true, email: true, phone: true } },
      },
    });

    return {
      message: 'Afiliado creado exitosamente',
      affiliate: newAffiliate,
    };
  }

  // ACTUALIZAR AFILIADO (Admin)
  async updateAffiliate(id: string, dto: {
    codigoReferido?: string;
    rango?: string;
    walletBalance?: number;
    referidoPor?: string;
    nombre?: string;
    phone?: string;
  }) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');

    // Si cambia el código, verificar unicidad
    if (dto.codigoReferido && dto.codigoReferido !== affiliate.codigoReferido) {
      const existing = await this.prisma.affiliate.findUnique({
        where: { codigoReferido: dto.codigoReferido.trim().toUpperCase() },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('El código de referido ya está en uso por otro vendedor');
      }
    }

    // Actualizar usuario si viene nombre o phone
    if (dto.nombre || dto.phone !== undefined) {
      await this.prisma.user.update({
        where: { id: affiliate.userId },
        data: {
          ...(dto.nombre && { nombre: dto.nombre }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
        },
      });
    }

    return this.prisma.affiliate.update({
      where: { id },
      data: {
        ...(dto.codigoReferido && { codigoReferido: dto.codigoReferido.trim().toUpperCase() }),
        ...(dto.rango && { rango: dto.rango }),
        ...(dto.walletBalance !== undefined && { walletBalance: dto.walletBalance }),
        ...(dto.referidoPor !== undefined && { referidoPor: dto.referidoPor || null }),
      },
      include: {
        user: { select: { id: true, nombre: true, email: true, phone: true } },
      },
    });
  }

  // ELIMINAR AFILIADO
  async removeAffiliate(id: string) {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');

    // Cambiar rol de usuario a CLIENTE
    await this.prisma.user.update({
      where: { id: affiliate.userId },
      data: { rol: UserRole.CLIENTE },
    });

    return this.prisma.affiliate.delete({
      where: { id },
    });
  }

  // OBTENER AFILIADO POR ID
  async getAffiliateById(id: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nombre: true, email: true, phone: true } },
        commissions: { orderBy: { createdAt: 'desc' }, take: 10 },
        withdrawals: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');
    return affiliate;
  }

  // OBTENER PERFIL DEL AFILIADO (Con estadísticas)
  async getAffiliateProfile(affiliateOrUserId: string) {
    let affiliate = await this.prisma.affiliate.findUnique({
      where: { id: affiliateOrUserId },
      include: {
        user: { select: { nombre: true, email: true, phone: true } },
        commissions: {
          where: { estado: 'disponible' },
          select: { montoComision: true },
        },
      },
    });

    if (!affiliate) {
      affiliate = await this.prisma.affiliate.findUnique({
        where: { userId: affiliateOrUserId },
        include: {
          user: { select: { nombre: true, email: true, phone: true } },
          commissions: {
            where: { estado: 'disponible' },
            select: { montoComision: true },
          },
        },
      });
    }

    if (!affiliate) {
      throw new NotFoundException('No se encontró perfil de afiliado para este usuario');
    }

    // Calcular ventas brutas del mes actual (total de órdenes pagadas gestionadas por este vendedor)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const ventasDelMes = await this.prisma.order.aggregate({
      where: {
        vendedorId: affiliate.userId,
        estado: OrderStatus.PAGADO,
        createdAt: { gte: inicioMes },
      },
      _sum: { total: true },
    });

    // Calcular total ganado históricamente
    const totalGanado = await this.prisma.commission.aggregate({
      where: { affiliateId: affiliate.id },
      _sum: { montoComision: true },
    });

    // Contar referidos directos
    const referidosDirectos = await this.prisma.affiliate.count({
      where: { referidoPor: affiliate.id },
    });

    // Determinar rango actual basado en ventas brutas del mes
    const ventasMensuales = ventasDelMes._sum.total?.toNumber() || 0;
    const rangoCalculado = this.calcularRango(ventasMensuales);

    // Actualizar rango si cambió
    if (rangoCalculado !== affiliate.rango) {
      await this.prisma.affiliate.update({
        where: { id: affiliate.id },
        data: { rango: rangoCalculado },
      });
    }

    const rates = this.COMMISSION_RATES[rangoCalculado as keyof typeof this.COMMISSION_RATES] || this.COMMISSION_RATES.bronce;
    const porcentajeGanancia = Math.round(rates.nivel1 * 100); // ej: 20

    // Consultar catálogo de planes activos para calcular ganancias
    const planesActivos = await this.prisma.plan.findMany({
      where: { activo: true },
      include: {
        service: true,
        accounts: { where: { estado: 'DISPONIBLE' } },
      },
      orderBy: { precio: 'asc' },
    });

    const catalogoConGanancias = planesActivos.map((p) => {
      const precioPublico = Number(p.precio);
      const gananciaEstimada = Math.round(precioPublico * rates.nivel1);
      const costoBase = precioPublico - gananciaEstimada;
      return {
        id: p.id,
        servicioNombre: p.service.nombre,
        servicioLogo: p.service.logoUrl,
        nombrePlan: p.nombrePlan,
        precioPublico,
        porcentajeVendedor: porcentajeGanancia,
        gananciaEstimada,
        costoBase,
        stockDisponible: p.accounts.length,
        duracionDias: p.duracionDias,
        pantallas: p.pantallasSimultaneas,
      };
    });

    // Ventas recientes gestionadas por este vendedor
    const ventasRecientes = await this.prisma.order.findMany({
      where: { vendedorId: affiliate.userId },
      include: {
        items: { include: { plan: { include: { service: true } } } },
        customer: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    return {
      id: affiliate.id,
      userId: affiliate.userId,
      nombre: affiliate.user.nombre,
      email: affiliate.user.email,
      whatsapp: affiliate.user.phone,
      codigoReferido: affiliate.codigoReferido,
      linkReferido: `https://tu-marca.com/ref/${affiliate.codigoReferido}`,
      rango: rangoCalculado,
      porcentajeGanancia,
      walletBalance: affiliate.walletBalance.toNumber(),
      totalGanado: totalGanado._sum.montoComision?.toNumber() || 0,
      ventasMesActual: ventasMensuales,
      referidosDirectos,
      progresoRango: this.calcularProgresoRango(ventasMensuales, rangoCalculado),
      rangosEstructura: [
        { rango: 'bronce', nombre: 'Bronce', porcentaje: 10, ventasMinimas: 0, descripcion: 'Comisión base para inicio de ventas' },
        { rango: 'plata', nombre: 'Plata', porcentaje: 15, ventasMinimas: 200, descripcion: 'Para vendedores con ventas constantes' },
        { rango: 'oro', nombre: 'Oro', porcentaje: 20, ventasMinimas: 800, descripcion: 'Vendedor destacado con alta rotación' },
        { rango: 'diamante', nombre: 'Diamante', porcentaje: 25, ventasMinimas: 2000, descripcion: 'Nivel Máster mayorista' },
      ],
      catalogoConGanancias,
      ventasRecientes: ventasRecientes.map((v) => ({
        id: v.id,
        total: Number(v.total),
        estado: v.estado,
        fecha: v.createdAt,
        descripcionVenta: v.descripcionVenta,
        gananciaVendedor: v.vendedorComision ? Number(v.vendedorComision) : 0,
        porcentajeAplicado: v.vendedorPorcentaje ? Number(v.vendedorPorcentaje) : porcentajeGanancia,
        clienteNombre: v.customer.user.nombre,
        items: v.items.map((it) => `${it.plan.service.nombre} (${it.plan.nombrePlan}) x${it.cantidad}`).join(', '),
      })),
    };
  }

  // LISTAR TODOS LOS AFILIADOS (Admin)
  async getAllAffiliates() {
    const affiliates = await this.prisma.affiliate.findMany({
      include: {
        user: { select: { nombre: true, email: true, phone: true } },
        _count: {
          select: {
            commissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return affiliates.map((aff) => ({
      id: aff.id,
      nombre: aff.user.nombre,
      email: aff.user.email,
      whatsapp: aff.user.phone,
      codigoReferido: aff.codigoReferido,
      rango: aff.rango,
      walletBalance: aff.walletBalance.toNumber(),
      totalComisiones: aff._count.commissions,
      fechaRegistro: aff.createdAt,
    }));
  }

  // ============================================
  // CÁLCULO Y ASIGNACIÓN DE COMISIONES
  // ============================================

  // CALCULAR Y ASIGNAR COMISIONES POR UNA VENTA
  async calculateAndAssignCommissions(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: { include: { plan: true } },
      },
    });

    if (!order || order.estado !== OrderStatus.PAGADO) {
      throw new BadRequestException('Orden no válida o no pagada');
    }

    // Buscar si el cliente fue referido por alguien
    // (Aquí asumimos que hay un campo "referidoPor" en la tabla customers)
    // Por simplicidad, buscaremos en los logs de notificación o en un campo adicional
    // En producción, deberías tener un campo "affiliateId" en la tabla customers

    // Para este ejemplo, asumimos que el cliente NO fue referido
    // Si lo fuera, buscarías el afiliado y calcularías la comisión

    // TODO: Implementar lógica para detectar si el cliente fue referido
    // Por ahora, solo retornamos sin hacer nada
    return {
      message: 'Comisiones calculadas (implementar lógica de referido)',
      comisionesGeneradas: 0,
    };
  }

  // MÉTODO MANUAL PARA ASIGNAR COMISIÓN (Para pruebas o correcciones)
  async manuallyAssignCommission(
    affiliateId: string,
    orderId: string,
    tipo: 'directa' | 'indirecta',
  ) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id: affiliateId },
    });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    // Calcular comisión según el rango
    const rates = this.COMMISSION_RATES[affiliate.rango as keyof typeof this.COMMISSION_RATES];
    const porcentaje = tipo === 'directa' ? rates.nivel1 : rates.nivel2;

    const montoComision = order.total.toNumber() * porcentaje;

    // Crear registro de comisión
    const commission = await this.prisma.commission.create({
      data: {
        affiliateId,
        orderId,
        tipo,
        porcentaje,
        montoComision,
        estado: 'disponible',
      },
    });

    // Actualizar wallet del afiliado
    await this.prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        walletBalance: { increment: montoComision },
      },
    });

    return {
      message: 'Comisión asignada exitosamente',
      commission: {
        id: commission.id,
        monto: montoComision,
        porcentaje: `${(Number(commission.porcentaje) * 100).toFixed(0)}%`,
        tipo,
      },
    };
  }

  // ============================================
  // SOLICITUDES DE RETIRO
  // ============================================

  // SOLICITAR RETIRO DE FONDO
  async requestWithdrawal(affiliateId: string, dto: RequestWithdrawalDto) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id: affiliateId },
    });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');

    // Verificar saldo suficiente
    if (affiliate.walletBalance.toNumber() < dto.monto) {
      throw new BadRequestException('Saldo insuficiente en tu billetera');
    }

    // Verificar monto mínimo
    if (dto.monto < 20) {
      throw new BadRequestException('El monto mínimo de retiro es $20');
    }

    // Crear solicitud de retiro
    const withdrawal = await this.prisma.walletWithdrawal.create({
      data: {
        affiliateId,
        monto: dto.monto,
        metodoPago: dto.metodoPago,
        datosPago: dto.datosPago,
        estado: 'pendiente',
      },
      include: {
        affiliate: {
          include: { user: { select: { nombre: true, email: true } } },
        },
      },
    });

    // Congelar el monto en la wallet (restar del saldo disponible)
    await this.prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        walletBalance: { decrement: dto.monto },
      },
    });

    return {
      message: 'Solicitud de retiro creada exitosamente',
      withdrawal: {
        id: withdrawal.id,
        monto: withdrawal.monto,
        metodoPago: withdrawal.metodoPago,
        estado: withdrawal.estado,
        fechaSolicitud: withdrawal.createdAt,
      },
    };
  }

  // LISTAR SOLICITUDES DE RETIRO (Admin)
  async getAllWithdrawals(filters: { estado?: string; affiliateId?: string }) {
    const withdrawals = await this.prisma.walletWithdrawal.findMany({
      where: {
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.affiliateId && { affiliateId: filters.affiliateId }),
      },
      include: {
        affiliate: {
          include: { user: { select: { nombre: true, email: true, phone: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return withdrawals.map((w) => ({
      id: w.id,
      afiliado: {
        nombre: w.affiliate.user.nombre,
        email: w.affiliate.user.email,
        whatsapp: w.affiliate.user.phone,
      },
      monto: w.monto.toNumber(),
      metodoPago: w.metodoPago,
      datosPago: JSON.parse(w.datosPago || '{}'),
      estado: w.estado,
      fechaSolicitud: w.createdAt,
    }));
  }

  // APROBAR O RECHAZAR RETIRO
  async approveWithdrawal(adminId: string, dto: ApproveWithdrawalDto) {
    const withdrawal = await this.prisma.walletWithdrawal.findUnique({
      where: { id: dto.withdrawalId },
      include: {
        affiliate: {
          include: { user: { select: { nombre: true, phone: true } } },
        },
      },
    });

    if (!withdrawal) throw new NotFoundException('Solicitud no encontrada');
    if (withdrawal.estado !== 'pendiente') {
      throw new BadRequestException('Esta solicitud ya fue procesada');
    }

    if (dto.decision === 'pagado') {
      // Marcar como pagado
      await this.prisma.walletWithdrawal.update({
        where: { id: dto.withdrawalId },
        data: { estado: 'pagado' },
      });

      // Notificar al afiliado
      try {
        await this.whatsappService.sendTextMessage(
          withdrawal.affiliate.user.phone,
          `¡Hola ${withdrawal.affiliate.user.nombre}! ✅\n\nTu retiro de $${withdrawal.monto.toNumber()} ha sido procesado exitosamente.\n\nMétodo: ${withdrawal.metodoPago}\n\n¡Gracias por vender con nosotros! 🚀`,
        );
      } catch (error) {
        this.logger.error(`Error notificando retiro aprobado: ${error.message}`);
      }

      return { message: 'Retiro aprobado y afiliado notificado' };
    }

    if (dto.decision === 'rechazado') {
      if (!dto.motivoRechazo) {
        throw new BadRequestException('Debes proporcionar un motivo de rechazo');
      }

      // Marcar como rechazado
      await this.prisma.walletWithdrawal.update({
        where: { id: dto.withdrawalId },
        data: { estado: 'rechazado' },
      });

      // Devolver el dinero a la wallet
      await this.prisma.affiliate.update({
        where: { id: withdrawal.affiliateId },
        data: {
          walletBalance: { increment: withdrawal.monto.toNumber() },
        },
      });

      // Notificar al afiliado
      try {
        await this.whatsappService.sendTextMessage(
          withdrawal.affiliate.user.phone,
          `Hola ${withdrawal.affiliate.user.nombre}, tu solicitud de retiro de $${withdrawal.monto.toNumber()} fue rechazada.\n\nMotivo: ${dto.motivoRechazo}\n\nEl monto ha sido devuelto a tu billetera. Si tienes dudas, responde este mensaje.`,
        );
      } catch (error) {
        this.logger.error(`Error notificando retiro rechazado: ${error.message}`);
      }

      return { message: 'Retiro rechazado y dinero devuelto a la wallet' };
    }
  }

  // ============================================
  // HISTORIAL Y ESTADÍSTICAS
  // ============================================

 // HISTORIAL DE COMISIONES DEL AFILIADO
async getCommissionHistory(affiliateId: string) {
  const commissions = await this.prisma.commission.findMany({
    where: { affiliateId },
    orderBy: { createdAt: 'desc' },
  });

  // Obtener las órdenes relacionadas manualmente
  const ordersMap = new Map();
  for (const commission of commissions) {
    if (commission.orderId && !ordersMap.has(commission.orderId)) {
      const order = await this.prisma.order.findUnique({
        where: { id: commission.orderId },
        include: {
          items: {
            include: {
              plan: {
                include: { service: { select: { nombre: true } } },
              },
            },
          },
        },
      });
      if (order) ordersMap.set(commission.orderId, order);
    }
  }

  return commissions.map((commission) => {
    const order = commission.orderId ? ordersMap.get(commission.orderId) : null;
    return {
      id: commission.id,
      tipo: commission.tipo,
      porcentaje: `${(Number(commission.porcentaje) * 100).toFixed(0)}%`,
      monto: Number(commission.montoComision),
      estado: commission.estado,
      fecha: commission.createdAt,
      orden: order
        ? {
            id: order.id,
            total: Number(order.total),
            productos: order.items.map((i) => ({
              servicio: i.plan.service.nombre,
              plan: i.plan.nombrePlan,
              cantidad: i.cantidad,
            })),
          }
        : null,
    };
  });
}
  // HISTORIAL DE RETIROS DEL AFILIADO
  async getWithdrawalHistory(affiliateId: string) {
    const withdrawals = await this.prisma.walletWithdrawal.findMany({
      where: { affiliateId },
      orderBy: { createdAt: 'desc' },
    });

    return withdrawals.map((w) => ({
      id: w.id,
      monto: w.monto.toNumber(),
      metodoPago: w.metodoPago,
      estado: w.estado,
      fechaSolicitud: w.createdAt,
    }));
  }

  // ESTADÍSTICAS GLOBALES DE AFILIADOS (Admin)
  async getAffiliateStats() {
    const totalAfiliados = await this.prisma.affiliate.count();

    const totalPagado = await this.prisma.walletWithdrawal.aggregate({
      where: { estado: 'pagado' },
      _sum: { monto: true },
    });

    const totalPendiente = await this.prisma.walletWithdrawal.aggregate({
      where: { estado: 'pendiente' },
      _sum: { monto: true },
    });

    const comisionesDelMes = await this.prisma.commission.aggregate({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(1)),
        },
      },
      _sum: { montoComision: true },
    });

    const afiliadosPorRango = await this.prisma.affiliate.groupBy({
      by: ['rango'],
      _count: true,
    });

    return {
      totalAfiliados,
      totalPagadoEnRetiros: totalPagado._sum.monto?.toNumber() || 0,
      totalPendienteDePago: totalPendiente._sum.monto?.toNumber() || 0,
      comisionesGeneradasEsteMes: comisionesDelMes._sum.montoComision?.toNumber() || 0,
      afiliadosPorRango: afiliadosPorRango.map((r) => ({
        rango: r.rango,
        cantidad: r._count,
      })),
    };
  }

  // ============================================
  // UTILIDADES
  // ============================================

  // CALCULAR RANGO BASADO EN VENTAS MENSUALES
  private calcularRango(ventasMensuales: number): string {
    if (ventasMensuales >= this.RANK_THRESHOLDS.diamante) return 'diamante';
    if (ventasMensuales >= this.RANK_THRESHOLDS.oro) return 'oro';
    if (ventasMensuales >= this.RANK_THRESHOLDS.plata) return 'plata';
    return 'bronce';
  }

  // CALCULAR PROGRESO HACIA EL SIGUIENTE RANGO
  private calcularProgresoRango(
    ventasMensuales: number,
    rangoActual: string,
  ): { actual: string; siguiente: string; progreso: number; faltante: number } {
    const rangos = ['bronce', 'plata', 'oro', 'diamante'];
    const indiceActual = rangos.indexOf(rangoActual);

    if (indiceActual === rangos.length - 1) {
      return {
        actual: rangoActual,
        siguiente: 'Máximo alcanzado',
        progreso: 100,
        faltante: 0,
      };
    }

    const rangoSiguiente = rangos[indiceActual + 1];
    const umbralSiguiente = this.RANK_THRESHOLDS[rangoSiguiente as keyof typeof this.RANK_THRESHOLDS];
    const umbralActual = this.RANK_THRESHOLDS[rangoActual as keyof typeof this.RANK_THRESHOLDS];

    const progreso = ((ventasMensuales - umbralActual) / (umbralSiguiente - umbralActual)) * 100;
    const faltante = umbralSiguiente - ventasMensuales;

    return {
      actual: rangoActual,
      siguiente: rangoSiguiente,
      progreso: Math.min(100, Math.max(0, progreso)),
      faltante: Math.max(0, faltante),
    };
  }
}