import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

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
          i.clienteEmail.toLowerCase().includes(q) ||
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
}
