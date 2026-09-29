import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, AccountStatus, SubscriptionStatus, UserRole } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // MÉTRICAS PRINCIPALES (KPIs)
  async getMainMetrics(currentUser?: any) {
    const isAdmin = currentUser?.rol === UserRole.ADMIN;
    const currentUserId = currentUser?.userId || currentUser?.id;
    const sellerOrderFilter = !isAdmin && currentUserId ? { vendedorId: currentUserId } : {};

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const hace7Dias = new Date(hoy);
    hace7Dias.setDate(hace7Dias.getDate() - 7);

    const hace30Dias = new Date(hoy);
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    // Ventas de hoy
    const ventasHoy = await this.prisma.order.aggregate({
      where: {
        estado: OrderStatus.PAGADO,
        createdAt: { gte: hoy, lt: mañana },
        ...sellerOrderFilter,
      },
      _sum: { total: true },
      _count: true,
    });

    // Ventas de la semana
    const ventasSemana = await this.prisma.order.aggregate({
      where: {
        estado: OrderStatus.PAGADO,
        createdAt: { gte: hace7Dias },
        ...sellerOrderFilter,
      },
      _sum: { total: true },
      _count: true,
    });

    // Ventas del mes
    const ventasMes = await this.prisma.order.aggregate({
      where: {
        estado: OrderStatus.PAGADO,
        createdAt: { gte: hace30Dias },
        ...sellerOrderFilter,
      },
      _sum: { total: true },
      _count: true,
    });

    // Suscripciones activas
    const suscripcionesActivas = await this.prisma.subscription.count({
      where: {
        estado: SubscriptionStatus.ACTIVA,
        ...(!isAdmin && currentUserId ? { order: { vendedorId: currentUserId } } : {}),
      },
    });

    // Clientes totales
    const clientesTotales = await this.prisma.customer.count({
      where: {
        ...(!isAdmin && currentUserId ? { orders: { some: { vendedorId: currentUserId } } } : {}),
      },
    });

    // Stock disponible (cuentas)
    const stockDisponible = await this.prisma.account.count({
      where: { estado: AccountStatus.DISPONIBLE },
    });

    return {
      ventasHoy: {
        total: ventasHoy._sum.total?.toNumber() || 0,
        cantidad: ventasHoy._count,
      },
      ventasSemana: {
        total: ventasSemana._sum.total?.toNumber() || 0,
        cantidad: ventasSemana._count,
      },
      ventasMes: {
        total: ventasMes._sum.total?.toNumber() || 0,
        cantidad: ventasMes._count,
      },
      suscripcionesActivas,
      clientesTotales,
      stockDisponible,
    };
  }

  // SUSCRIPCIONES POR ESTADO
  async getSubscriptionsByStatus(currentUser?: any) {
    const isAdmin = currentUser?.rol === UserRole.ADMIN;
    const currentUserId = currentUser?.userId || currentUser?.id;
    const sellerSubFilter = !isAdmin && currentUserId ? { order: { vendedorId: currentUserId } } : {};

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const en3Dias = new Date(hoy);
    en3Dias.setDate(en3Dias.getDate() + 3);

    const activas = await this.prisma.subscription.count({
      where: {
        estado: SubscriptionStatus.ACTIVA,
        ...sellerSubFilter,
      },
    });

    const porVencer = await this.prisma.subscription.count({
      where: {
        estado: SubscriptionStatus.ACTIVA,
        fechaVencimiento: { gte: hoy, lte: en3Dias },
        ...sellerSubFilter,
      },
    });

    const vencidas = await this.prisma.subscription.count({
      where: {
        estado: SubscriptionStatus.ACTIVA,
        fechaVencimiento: { lt: hoy },
        ...sellerSubFilter,
      },
    });

    const enGarantia = await this.prisma.subscription.count({
      where: {
        estado: SubscriptionStatus.EN_GARANTIA,
        ...sellerSubFilter,
      },
    });

    return {
      activas,
      porVencer,
      vencidas,
      enGarantia,
    };
  }

  // STOCK POR PLATAFORMA
  async getStockByPlatform() {
    const platforms = await this.prisma.service.findMany({
      where: { activo: true },
      include: {
        plans: {
          where: { activo: true },
          include: {
            accounts: {
              where: { estado: AccountStatus.DISPONIBLE },
              select: { id: true },
            },
          },
        },
      },
    });

    return platforms.map((platform) => {
      const totalDisponible = platform.plans.reduce(
        (sum, plan) => sum + plan.accounts.length,
        0,
      );

      return {
        id: platform.id,
        nombre: platform.nombre,
        logoUrl: platform.logoUrl,
        stockDisponible: totalDisponible,
        planes: platform.plans.map((plan) => ({
          id: plan.id,
          nombre: plan.nombrePlan,
          precio: plan.precio,
          disponibles: plan.accounts.length,
        })),
      };
    });
  }

  // ALERTAS CRÍTICAS
  async getCriticalAlerts(currentUser?: any) {
    const isAdmin = currentUser?.rol === UserRole.ADMIN;
    const currentUserId = currentUser?.userId || currentUser?.id;
    const sellerOrderFilter = !isAdmin && currentUserId ? { vendedorId: currentUserId } : {};
    const sellerSubFilter = !isAdmin && currentUserId ? { order: { vendedorId: currentUserId } } : {};

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const en3Dias = new Date(hoy);
    en3Dias.setDate(en3Dias.getDate() + 3);

    // 1. Cuentas por vencer en 3 días
    const porVencerPronto = await this.prisma.subscription.count({
      where: {
        estado: SubscriptionStatus.ACTIVA,
        fechaVencimiento: { gte: hoy, lte: en3Dias },
        ...sellerSubFilter,
      },
    });

    // 2. Órdenes pendientes de validación
    const ordenesPendientes = await this.prisma.order.count({
      where: {
        estado: OrderStatus.PENDIENTE,
        ...sellerOrderFilter,
      },
    });

    // 3. Tickets de soporte abiertos
    const ticketsAbiertos = await this.prisma.supportTicket.count({
      where: {
        estado: 'pendiente_revision',
        ...(!isAdmin && currentUserId ? { subscription: { order: { vendedorId: currentUserId } } } : {}),
      },
    });

    // 4. Lotes con alta tasa de fallo (solo visible para admin)
    const lotesProblematicos = isAdmin
      ? await this.prisma.supplierBatch.findMany({
          where: {
            tasaFalloActual: { gt: 15 },
            estadoLote: 'activo',
          },
          select: {
            id: true,
            proveedorNombre: true,
            tasaFalloActual: true,
          },
        })
      : [];

    // 5. Stock bajo (menos de 5 cuentas disponibles por plan)
    const stockBajo = await this.prisma.plan.findMany({
      where: { activo: true },
      include: {
        accounts: {
          where: { estado: AccountStatus.DISPONIBLE },
          select: { id: true },
        },
        service: { select: { nombre: true } },
      },
    });

    const planesConStockBajo = stockBajo
      .filter((plan) => plan.accounts.length < 5 && plan.accounts.length > 0)
      .map((plan) => ({
        planId: plan.id,
        servicio: plan.service.nombre,
        plan: plan.nombrePlan,
        disponibles: plan.accounts.length,
      }));

    return {
      porVencerPronto,
      ordenesPendientes,
      ticketsAbiertos,
      lotesProblematicos,
      planesConStockBajo,
    };
  }

  // VENTAS POR DÍA (Últimos 30 días)
  async getSalesTrend(currentUser?: any) {
    const isAdmin = currentUser?.rol === UserRole.ADMIN;
    const currentUserId = currentUser?.userId || currentUser?.id;
    const sellerFilter = !isAdmin && currentUserId ? { vendedorId: currentUserId } : {};

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const orders = await this.prisma.order.findMany({
      where: {
        estado: OrderStatus.PAGADO,
        createdAt: { gte: hace30Dias },
        ...sellerFilter,
      },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por día
    const ventasPorDia = orders.reduce((acc, order) => {
      const fecha = order.createdAt.toISOString().split('T')[0];
      if (!acc[fecha]) {
        acc[fecha] = { fecha, total: 0, cantidad: 0 };
      }
      acc[fecha].total += order.total.toNumber();
      acc[fecha].cantidad += 1;
      return acc;
    }, {} as Record<string, { fecha: string; total: number; cantidad: number }>);

    return Object.values(ventasPorDia);
  }

  // TOP PLATAFORMAS MÁS VENDIDAS
  async getTopPlatforms(currentUser?: any) {
    const isAdmin = currentUser?.rol === UserRole.ADMIN;
    const currentUserId = currentUser?.userId || currentUser?.id;
    const sellerFilter = !isAdmin && currentUserId ? { vendedorId: currentUserId } : {};

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const topPlatforms = await this.prisma.orderItem.groupBy({
      by: ['planId'],
      where: {
        order: {
          estado: OrderStatus.PAGADO,
          createdAt: { gte: hace30Dias },
          ...sellerFilter,
        },
      },
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 5,
    });

    // Enriquecer con datos del plan y servicio
    const enriched = await Promise.all(
      topPlatforms.map(async (item) => {
        const plan = await this.prisma.plan.findUnique({
          where: { id: item.planId },
          include: { service: true },
        });

        return {
          servicio: plan?.service.nombre || 'Desconocido',
          plan: plan?.nombrePlan || 'Desconocido',
          cantidadVendida: item._sum.cantidad || 0,
          totalIngresos: item._sum.subtotal?.toNumber() || 0,
        };
      }),
    );

    return enriched;
  }

  // DASHBOARD COMPLETO (Todo en una llamada)
  async getFullDashboard(currentUser?: any) {
    const [metrics, subscriptions, stock, alerts, trend, topPlatforms] =
      await Promise.all([
        this.getMainMetrics(currentUser),
        this.getSubscriptionsByStatus(currentUser),
        this.getStockByPlatform(),
        this.getCriticalAlerts(currentUser),
        this.getSalesTrend(currentUser),
        this.getTopPlatforms(currentUser),
      ]);

    return {
      metrics,
      subscriptions,
      stock,
      alerts,
      trend,
      topPlatforms,
      generatedAt: new Date(),
    };
  }
}