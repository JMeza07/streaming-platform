import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, UserRole } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // REPORTES FINANCIEROS (Por Días, Meses y Años)
  async getFinancialReports() {
    const orders = await this.prisma.order.findMany({
      where: { estado: OrderStatus.PAGADO },
      select: {
        id: true,
        total: true,
        createdAt: true,
        vendedorId: true,
        vendedorNombre: true,
        vendedorComision: true,
        metodoPago: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalHistorico = 0;
    let totalComisionesVendedores = 0;
    const porDiaMap: Record<string, { fecha: string; total: number; cantidad: number; online: number; vendedor: number }> = {};
    const porMesMap: Record<string, { mes: string; label: string; total: number; cantidad: number; comisiones: number }> = {};
    const porAnoMap: Record<string, { ano: string; total: number; cantidad: number; comisiones: number }> = {};

    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    const mesActualStr = hoyStr.substring(0, 7);
    const anoActualStr = hoyStr.substring(0, 4);

    let totalHoy = 0;
    let totalMesActual = 0;
    let totalAnoActual = 0;

    for (const ord of orders) {
      const valor = Number(ord.total) || 0;
      const comision = ord.vendedorComision ? Number(ord.vendedorComision) : 0;
      const fechaObj = new Date(ord.createdAt);
      const diaKey = fechaObj.toISOString().split('T')[0]; // YYYY-MM-DD
      const mesKey = diaKey.substring(0, 7); // YYYY-MM
      const anoKey = diaKey.substring(0, 4); // YYYY

      totalHistorico += valor;
      totalComisionesVendedores += comision;

      if (diaKey === hoyStr) totalHoy += valor;
      if (mesKey === mesActualStr) totalMesActual += valor;
      if (anoKey === anoActualStr) totalAnoActual += valor;

      const isVendedor = !!(ord.vendedorNombre || ord.vendedorId);

      // Por Día
      if (!porDiaMap[diaKey]) {
        porDiaMap[diaKey] = { fecha: diaKey, total: 0, cantidad: 0, online: 0, vendedor: 0 };
      }
      porDiaMap[diaKey].total += valor;
      porDiaMap[diaKey].cantidad += 1;
      if (isVendedor) {
        porDiaMap[diaKey].vendedor += valor;
      } else {
        porDiaMap[diaKey].online += valor;
      }

      // Por Mes
      if (!porMesMap[mesKey]) {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mIndex = parseInt(mesKey.split('-')[1], 10) - 1;
        const label = `${monthNames[mIndex] || mesKey} ${anoKey}`;
        porMesMap[mesKey] = { mes: mesKey, label, total: 0, cantidad: 0, comisiones: 0 };
      }
      porMesMap[mesKey].total += valor;
      porMesMap[mesKey].cantidad += 1;
      porMesMap[mesKey].comisiones += comision;

      // Por Año
      if (!porAnoMap[anoKey]) {
        porAnoMap[anoKey] = { ano: anoKey, total: 0, cantidad: 0, comisiones: 0 };
      }
      porAnoMap[anoKey].total += valor;
      porAnoMap[anoKey].cantidad += 1;
      porAnoMap[anoKey].comisiones += comision;
    }

    // Convertir a arreglos ordenados
    const ingresosPorDia = Object.values(porDiaMap).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ingresosPorMes = Object.values(porMesMap).sort((a, b) => b.mes.localeCompare(a.mes));
    const ingresosPorAno = Object.values(porAnoMap).sort((a, b) => b.ano.localeCompare(a.ano));

    return {
      resumen: {
        totalHistorico,
        totalHoy,
        totalMesActual,
        totalAnoActual,
        totalComisionesVendedores,
        totalOrdenes: orders.length,
        ticketPromedio: orders.length > 0 ? Math.round(totalHistorico / orders.length) : 0,
      },
      ingresosPorDia,
      ingresosPorMes,
      ingresosPorAno,
    };
  }

  // DIRECTORIO DE CLIENTES (Filtrado por Plataforma y Fecha)
  async getCustomersReport(filters: {
    platformId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
  }) {
    const customers = await this.prisma.customer.findMany({
      where: {
        user: { rol: UserRole.CLIENTE },
      },
      include: {
        user: {
          select: { id: true, nombre: true, email: true, phone: true, activo: true, createdAt: true },
        },
        subscriptions: {
          include: {
            plan: {
              include: {
                service: { select: { id: true, nombre: true, logoUrl: true } },
              },
            },
          },
        },
        orders: {
          where: { estado: OrderStatus.PAGADO },
          select: { id: true, total: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let items = customers.map((c) => {
      const totalGastado = c.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const plataformasMap = new Map<string, { id: string; nombre: string; logoUrl: string | null }>();

      c.subscriptions.forEach((sub) => {
        if (sub.plan?.service) {
          plataformasMap.set(sub.plan.service.id, {
            id: sub.plan.service.id,
            nombre: sub.plan.service.nombre,
            logoUrl: sub.plan.service.logoUrl,
          });
        }
      });

      const plataformas = Array.from(plataformasMap.values());
      const ultimasCompras = c.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        id: c.id,
        userId: c.user.id,
        nombre: c.user.nombre,
        email: c.user.email,
        telefono: c.whatsapp || c.user.phone || null,
        whatsapp: c.whatsapp || c.user.phone || null,
        pais: c.pais || 'Colombia',
        activo: c.user.activo,
        createdAt: c.createdAt,
        fechaRegistro: c.createdAt,
        totalGastado,
        totalOrdenes: c.orders.length,
        cantidadOrdenes: c.orders.length,
        cantidadSuscripciones: c.subscriptions.length,
        ultimaCompra: ultimasCompras.length > 0 ? ultimasCompras[0].createdAt : null,
        plataformas,
      };
    });

    // Filtro por plataforma contratada
    if (filters.platformId && filters.platformId !== 'todas') {
      items = items.filter((c) => c.plataformas.some((p) => p.id === filters.platformId));
    }

    // Filtro por fecha de registro
    if (filters.fechaDesde || filters.fechaHasta) {
      items = items.filter((c) => {
        const d = new Date(c.fechaRegistro);
        if (filters.fechaDesde && d < new Date(filters.fechaDesde)) return false;
        if (filters.fechaHasta) {
          const hasta = new Date(filters.fechaHasta);
          hasta.setHours(23, 59, 59, 999);
          if (d > hasta) return false;
        }
        return true;
      });
    }

    // Búsqueda por texto
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.whatsapp && c.whatsapp.includes(q))
      );
    }

    return items;
  }
}
