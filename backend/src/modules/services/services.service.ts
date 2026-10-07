import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    return this.prisma.service.create({ data: dto });
  }

  async findAll() {
    const services = await this.prisma.service.findMany({
      where: { activo: true },
      include: {
        plans: {
          where: { activo: true },
          include: {
            accounts: {
              where: { estado: 'DISPONIBLE' },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services.map((s) => ({
      ...s,
      plans: s.plans.map((p) => ({
        ...p,
        stockDisponible: p.accounts.length,
      })),
      stockDisponibleTotal: s.plans.reduce((sum, p) => sum + p.accounts.length, 0),
    }));
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        plans: {
          include: {
            accounts: {
              where: { estado: 'DISPONIBLE' },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!service) throw new NotFoundException('Plataforma no encontrada');
    return {
      ...service,
      plans: service.plans.map((p) => ({
        ...p,
        stockDisponible: p.accounts.length,
      })),
      stockDisponibleTotal: service.plans.reduce((sum, p) => sum + p.accounts.length, 0),
    };
  }

  async update(id: string, dto: Partial<CreateServiceDto>) {
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.service.update({
      where: { id },
      data: { activo: false }, // Soft delete
    });
  }

  // =========================================================================
  // SRS RF-007 (PUNTO 16): PLANTILLAS ENLAZADAS DINÁMICAMENTE AL CATÁLOGO DE PRECIOS
  // =========================================================================
  async generatePriceListTemplate() {
    const services = await this.prisma.service.findMany({
      where: { activo: true },
      include: {
        plans: {
          where: { activo: true },
          include: {
            accounts: {
              where: { estado: 'DISPONIBLE' },
              select: { id: true },
            },
          },
          orderBy: { precio: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    const combos = await this.prisma.combo.findMany({
      where: { activo: true },
      include: {
        items: {
          include: {
            plan: {
              include: { service: true },
            },
          },
        },
      },
    });

    const lines: string[] = [];
    lines.push('🌟 *OASIS VIRTUAL STORE - LISTA OFICIAL DE PRECIOS* 🌟');
    lines.push('⚡ *Cuentas Premium & Perfiles con Entrega Inmediata*\n');

    for (const service of services) {
      if (service.plans.length === 0) continue;
      
      const pinNotice = service.usaPin ? '🔒' : '🔓 Sin PIN';
      lines.push(`📺 *${service.nombre.toUpperCase()}* ${pinNotice}`);

      for (const plan of service.plans) {
        const precioFormatted = Number(plan.precio).toLocaleString('es-CO');
        const duracion = plan.duracionDias ? `${plan.duracionDias} días` : '30 días';
        const res = plan.resolucion ? ` (${plan.resolucion})` : '';
        const pantallas = plan.pantallasSimultaneas > 1 ? ` [${plan.pantallasSimultaneas} Pantallas]` : '';
        const stock = plan.accounts.length > 0 ? `✅ Disponible` : `⏳ Por encargo`;
        
        lines.push(`  • *${plan.nombrePlan}*${res}${pantallas} (${duracion}): *$${precioFormatted} COP* [${stock}]`);
      }
      lines.push('');
    }

    if (combos.length > 0) {
      lines.push('🎁 *COMBOS PROMOCIONALES (MÁS AHORRO):*');
      for (const combo of combos) {
        const precioFormatted = Number(combo.precioCombo).toLocaleString('es-CO');
        const itemsNombres = combo.items.map((i) => i.plan.service.nombre).join(' + ');
        const desc = combo.descuentoPorcentaje ? ` (Ahorro del ${Number(combo.descuentoPorcentaje).toFixed(0)}%)` : '';
        lines.push(`  🔥 *${combo.nombre}* [${itemsNombres}]: *$${precioFormatted} COP*${desc}`);
      }
      lines.push('');
    }

    lines.push('💳 *MÉTODOS DE PAGO DISPONIBLES:*');
    lines.push('• Nequi / Daviplata / Bancolombia');
    lines.push('• Transferencias PSE & Tarjetas Débito/Crédito');
    lines.push('• Cripto / Binance Pay (USDT)');
    lines.push('\n🛡️ *Garantía Total 100% durante el tiempo contratado.*');
    lines.push('📲 *¿Cuál servicio deseas activar hoy?*');

    const templateText = lines.join('\n');

    return {
      templateText,
      totalServices: services.length,
      totalCombos: combos.length,
      generatedAt: new Date(),
    };
  }

  async generateServiceTemplate(serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        plans: {
          where: { activo: true },
          include: {
            accounts: {
              where: { estado: 'DISPONIBLE' },
              select: { id: true },
            },
          },
          orderBy: { precio: 'asc' },
        },
      },
    });

    if (!service) throw new NotFoundException('Plataforma no encontrada');

    const lines: string[] = [];
    lines.push(`🎬 *OASIS VIRTUAL STORE - PLANES ${service.nombre.toUpperCase()}* 🎬\n`);
    if (service.descripcion) {
      lines.push(`ℹ️ ${service.descripcion}\n`);
    }

    const pinNotice = service.usaPin ? '🔒 Perfil con PIN exclusivo' : '🔓 Acceso directo (Sin PIN requerido)';
    lines.push(`🛡️ *Tipo de Acceso:* ${pinNotice}\n`);

    for (const plan of service.plans) {
      const precioFormatted = Number(plan.precio).toLocaleString('es-CO');
      const duracion = plan.duracionDias ? `${plan.duracionDias} días` : '30 días';
      const stock = plan.accounts.length > 0 ? `✅ Disponible (${plan.accounts.length} cupos)` : `⏳ Stock bajo pedido`;
      
      lines.push(`👉 *${plan.nombrePlan}*`);
      lines.push(`   💰 Precio: *$${precioFormatted} COP*`);
      lines.push(`   ⏱️ Duración: ${duracion}`);
      if (plan.resolucion) lines.push(`   📺 Calidad: ${plan.resolucion}`);
      lines.push(`   📦 Disponibilidad: ${stock}\n`);
    }

    lines.push('💳 *Paga fácil por:* Nequi, Daviplata, Bancolombia o Binance USDT.');
    lines.push('⚡ Activación inmediata tras confirmación.');

    return {
      serviceNombre: service.nombre,
      templateText: lines.join('\n'),
      plansCount: service.plans.length,
    };
  }
}