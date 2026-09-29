import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_MEDIOS_PAGO = [
  {
    id: 'nequi-1',
    banco: 'Nequi',
    tipoCuenta: 'Billetera Digital',
    numeroCuenta: '3001234567',
    titular: 'StreamControl Pagos',
    documento: 'CC 1.098.765.432',
    instrucciones: 'Envía a Nequi directamente. Copia el número y adjunta tu soporte.',
    activo: true,
  },
  {
    id: 'bancolombia-1',
    banco: 'Bancolombia',
    tipoCuenta: 'Cuenta de Ahorros',
    numeroCuenta: '912-000123-45',
    titular: 'StreamControl SAS',
    documento: 'NIT 901.234.567-8',
    instrucciones: 'Transferencia directa desde App Bancolombia o QR Bancolombia.',
    activo: true,
  },
  {
    id: 'daviplata-1',
    banco: 'Daviplata',
    tipoCuenta: 'Billetera Digital',
    numeroCuenta: '3001234567',
    titular: 'StreamControl Pagos',
    documento: 'CC 1.098.765.432',
    instrucciones: 'Acepta transferencias directas de Daviplata o vía Transfiya.',
    activo: true,
  },
];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // OBTENER CONFIGURACIONES GLOBALES (Público / Admin)
  async getSettings() {
    let settings = await this.prisma.systemSetting.findUnique({
      where: { id: 'singleton' },
    });

    if (!settings) {
      settings = await this.prisma.systemSetting.create({
        data: {
          id: 'singleton',
          mantenimiento: false,
          mensajeMantenimiento:
            'Estamos realizando mantenimiento programado en la plataforma. Pronto estaremos de vuelta.',
          nombrePlataforma: 'StreamControl',
          whatsappSoporte: '+573001234567',
          moneda: 'COP',
          comisionBase: 10,
          garantiaDiasBase: 30,
          mediosPago: DEFAULT_MEDIOS_PAGO,
        },
      });
    } else if (!settings.mediosPago || (Array.isArray(settings.mediosPago) && (settings.mediosPago as any[]).length === 0)) {
      settings = await this.prisma.systemSetting.update({
        where: { id: 'singleton' },
        data: { mediosPago: DEFAULT_MEDIOS_PAGO },
      });
    }

    return settings;
  }

  // ACTUALIZAR CONFIGURACIONES GLOBALES (Solo Admin)
  async updateSettings(dto: {
    mantenimiento?: boolean;
    mensajeMantenimiento?: string;
    nombrePlataforma?: string;
    logoUrl?: string;
    whatsappSoporte?: string;
    moneda?: string;
    comisionBase?: number;
    garantiaDiasBase?: number;
    mediosPago?: any;
  }) {
    // Asegurar que exista
    await this.getSettings();

    return this.prisma.systemSetting.update({
      where: { id: 'singleton' },
      data: {
        ...(dto.mantenimiento !== undefined && { mantenimiento: dto.mantenimiento }),
        ...(dto.mensajeMantenimiento !== undefined && {
          mensajeMantenimiento: dto.mensajeMantenimiento,
        }),
        ...(dto.nombrePlataforma !== undefined && {
          nombrePlataforma: dto.nombrePlataforma,
        }),
        ...(dto.logoUrl !== undefined && {
          logoUrl: dto.logoUrl,
        }),
        ...(dto.whatsappSoporte !== undefined && {
          whatsappSoporte: dto.whatsappSoporte,
        }),
        ...(dto.moneda !== undefined && { moneda: dto.moneda }),
        ...(dto.comisionBase !== undefined && {
          comisionBase: Number(dto.comisionBase),
        }),
        ...(dto.garantiaDiasBase !== undefined && {
          garantiaDiasBase: Number(dto.garantiaDiasBase),
        }),
        ...(dto.mediosPago !== undefined && {
          mediosPago: dto.mediosPago,
        }),
      },
    });
  }

  // CREAR COPIA DE SEGURIDAD (BACKUP COMPLETO EN JSON)
  async createBackup() {
    const [
      settings,
      services,
      plans,
      accounts,
      users,
      customers,
      orders,
      orderItems,
      subscriptions,
      affiliates,
      commissions,
    ] = await Promise.all([
      this.prisma.systemSetting.findMany(),
      this.prisma.service.findMany(),
      this.prisma.plan.findMany(),
      this.prisma.account.findMany(),
      this.prisma.user.findMany(),
      this.prisma.customer.findMany(),
      this.prisma.order.findMany(),
      this.prisma.orderItem.findMany(),
      this.prisma.subscription.findMany(),
      this.prisma.affiliate.findMany(),
      this.prisma.commission.findMany(),
    ]);

    return {
      version: '1.0',
      tipo: 'backup_completo',
      generadoEl: new Date().toISOString(),
      estadisticas: {
        servicios: services.length,
        planes: plans.length,
        cuentasInventario: accounts.length,
        usuarios: users.length,
        clientes: customers.length,
        ordenes: orders.length,
        suscripciones: subscriptions.length,
        afiliados: affiliates.length,
      },
      data: {
        settings,
        services,
        plans,
        accounts,
        users,
        customers,
        orders,
        orderItems,
        subscriptions,
        affiliates,
        commissions,
      },
    };
  }

  // RESTAURAR COPIA DE SEGURIDAD
  async restoreBackup(backupJson: any) {
    if (!backupJson || !backupJson.data) {
      throw new BadRequestException('El archivo de copia de seguridad no tiene un formato válido.');
    }

    const { data } = backupJson;

    try {
      // Restauración en transacción segura
      await this.prisma.$transaction(async (tx) => {
        // 1. Restaurar configuración
        if (data.settings && Array.isArray(data.settings) && data.settings.length > 0) {
          const s = data.settings[0];
          await tx.systemSetting.upsert({
            where: { id: 'singleton' },
            update: {
              mantenimiento: s.mantenimiento ?? false,
              mensajeMantenimiento: s.mensajeMantenimiento ?? '',
              nombrePlataforma: s.nombrePlataforma ?? 'StreamControl',
              logoUrl: s.logoUrl ?? null,
              whatsappSoporte: s.whatsappSoporte ?? '+573001234567',
              moneda: s.moneda ?? 'COP',
              comisionBase: s.comisionBase ?? 10,
              garantiaDiasBase: s.garantiaDiasBase ?? 30,
            },
            create: {
              id: 'singleton',
              mantenimiento: s.mantenimiento ?? false,
              mensajeMantenimiento: s.mensajeMantenimiento ?? '',
              nombrePlataforma: s.nombrePlataforma ?? 'StreamControl',
              logoUrl: s.logoUrl ?? null,
              whatsappSoporte: s.whatsappSoporte ?? '+573001234567',
              moneda: s.moneda ?? 'COP',
              comisionBase: s.comisionBase ?? 10,
              garantiaDiasBase: s.garantiaDiasBase ?? 30,
            },
          });
        }

        // 2. Restaurar o upsert Servicios
        if (data.services && Array.isArray(data.services)) {
          for (const s of data.services) {
            await tx.service.upsert({
              where: { id: s.id },
              update: { nombre: s.nombre, logoUrl: s.logoUrl, descripcion: s.descripcion, activo: s.activo },
              create: s,
            });
          }
        }

        // 3. Restaurar o upsert Planes
        if (data.plans && Array.isArray(data.plans)) {
          for (const p of data.plans) {
            await tx.plan.upsert({
              where: { id: p.id },
              update: {
                nombrePlan: p.nombrePlan,
                precio: p.precio,
                resolucion: p.resolucion,
                pantallasSimultaneas: p.pantallasSimultaneas,
                duracionDias: p.duracionDias,
                garantiaDias: p.garantiaDias,
                activo: p.activo,
              },
              create: p,
            });
          }
        }

        // 4. Restaurar o upsert Cuentas de inventario
        if (data.accounts && Array.isArray(data.accounts)) {
          for (const a of data.accounts) {
            await tx.account.upsert({
              where: { id: a.id },
              update: {
                emailCuenta: a.emailCuenta,
                passwordCuenta: a.passwordCuenta,
                perfilAsignado: a.perfilAsignado,
                pinPerfil: a.pinPerfil,
                estado: a.estado,
              },
              create: a,
            });
          }
        }
      });

      return {
        success: true,
        message: 'Copia de seguridad restaurada exitosamente.',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      throw new BadRequestException(`Error al restaurar la copia de seguridad: ${err.message}`);
    }
  }
}
