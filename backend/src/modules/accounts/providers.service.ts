import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditCategory, AuditSeverity, RootAccountStatus, AccountStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // LISTAR PROVEEDORES
  async getAll() {
    return this.prisma.provider.findMany({
      include: {
        _count: {
          select: {
            rootAccounts: true,
            batches: true,
            incidents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // OBTENER UNO
  async getById(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        rootAccounts: {
          include: {
            accounts: true,
            service: true,
          },
        },
        incidents: {
          orderBy: { createdAt: 'desc' },
        },
        batches: true,
      },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    return provider;
  }

  // CREAR PROVEEDOR
  async create(data: { nombre: string; contacto?: string; telefono?: string; email?: string }) {
    const existing = await this.prisma.provider.findUnique({ where: { nombre: data.nombre.trim() } });
    if (existing) throw new BadRequestException('Ya existe un proveedor con este nombre');

    const provider = await this.prisma.provider.create({
      data: {
        nombre: data.nombre.trim(),
        contacto: data.contacto,
        telefono: data.telefono,
        email: data.email,
        estado: 'ACTIVO',
      },
    });

    await this.auditService.registrarEvento({
      modulo: AuditCategory.INVENTARIO,
      accion: 'CREACION_PROVEEDOR',
      severidad: AuditSeverity.INFO,
      descripcion: `Nuevo proveedor creado: ${provider.nombre}`,
      entidadTipo: 'Provider',
      entidadId: provider.id,
    });

    return provider;
  }

  // ACTUALIZAR PROVEEDOR
  async update(id: string, data: { nombre?: string; contacto?: string; telefono?: string; email?: string; estado?: string }) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    return this.prisma.provider.update({
      where: { id },
      data,
    });
  }

  // =========================================================================
  // ESCENARIO 9: CAÍDA MASIVA DE PROVEEDOR (CASCADE UPDATE + CONGELAMIENTO)
  // =========================================================================
  async markProviderAsDown(id: string, reason: string, currentUser: any) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        rootAccounts: {
          include: {
            accounts: {
              include: {
                subscriptions: {
                  where: { estado: SubscriptionStatus.ACTIVA },
                  include: {
                    customer: { include: { user: true } },
                    plan: { include: { service: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const now = new Date();
    const rootAccountIds = provider.rootAccounts.map((r) => r.id);

    // Contabilizar impacto
    let totalCuentasAfectadas = 0;
    let totalClientesAfectados = 0;
    const affectedSubscriptionIds: string[] = [];

    provider.rootAccounts.forEach((r) => {
      totalCuentasAfectadas += r.accounts.length;
      r.accounts.forEach((a) => {
        a.subscriptions.forEach((sub) => {
          affectedSubscriptionIds.push(sub.id);
          totalClientesAfectados++;
        });
      });
    });

    // Ejecutar actualización en cascada transaccional
    const incident = await this.prisma.$transaction(async (tx) => {
      // 1. Marcar proveedor como CAIDO
      await tx.provider.update({
        where: { id },
        data: { estado: 'CAIDO' },
      });

      // 2. Marcar todas las cuentas raíz como CAIDA
      if (rootAccountIds.length > 0) {
        await tx.rootAccount.updateMany({
          where: { id: { in: rootAccountIds } },
          data: { estado: RootAccountStatus.CAIDA },
        });

        // 3. Marcar perfiles dependientes como DEFECTUOSA
        await tx.account.updateMany({
          where: { rootAccountId: { in: rootAccountIds } },
          data: { estado: AccountStatus.DEFECTUOSA },
        });
      }

      // 4. Congelar días restantes y pasar suscripciones activas a EN_GARANTIA
      for (const r of provider.rootAccounts) {
        for (const acc of r.accounts) {
          for (const sub of acc.subscriptions) {
            const vencimiento = new Date(sub.fechaVencimiento);
            const diasRestantes = Math.max(
              0,
              Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            );

            await tx.subscription.update({
              where: { id: sub.id },
              data: {
                estado: SubscriptionStatus.EN_GARANTIA,
                diasPendientes: diasRestantes,
                congeladoAt: now,
              },
            });
          }
        }
      }

      // 5. Generar Ticket Maestro de Incidencia B2B
      const newIncident = await tx.rootAccountIncident.create({
        data: {
          providerId: id,
          titulo: `Caída masiva de proveedor: ${provider.nombre}`,
          descripcion: reason || 'Caída masiva reportada por el administrador',
          cuentasAfectadas: totalCuentasAfectadas,
          clientesAfectados: totalClientesAfectados,
          estado: 'ABIERTO',
        },
      });

      return newIncident;
    });

    // Auditoría
    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      usuarioNombre: currentUser?.nombre || 'Admin',
      modulo: AuditCategory.SISTEMA,
      accion: 'CAIDA_MASIVA_PROVEEDOR',
      severidad: AuditSeverity.CRITICAL,
      descripcion: `Proveedor [${provider.nombre}] marcado como CAÍDO. Impacto: ${totalCuentasAfectadas} cuentas raíz/perfiles, ${totalClientesAfectados} clientes congelados en garantía. Motivo: ${reason}`,
      entidadTipo: 'Provider',
      entidadId: provider.id,
      detalles: {
        incidentId: incident.id,
        cuentasAfectadas: totalCuentasAfectadas,
        clientesAfectados: totalClientesAfectados,
      },
    });

    return {
      message: `Proveedor ${provider.nombre} marcado como CAÍDO. Se aplicó actualización en cascada exitosa.`,
      incident,
      resumen: {
        cuentasRaizAfectadas: provider.rootAccounts.length,
        perfilesAfectados: totalCuentasAfectadas,
        clientesEnGarantia: totalClientesAfectados,
      },
    };
  }

  // REACTIVAR PROVEEDOR (Descongelar días pendientes)
  async reactivateProvider(id: string, currentUser: any) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        rootAccounts: {
          include: {
            accounts: {
              include: {
                subscriptions: {
                  where: { estado: SubscriptionStatus.EN_GARANTIA, diasPendientes: { gt: 0 } },
                },
              },
            },
          },
        },
      },
    });

    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const now = new Date();
    let reactivadas = 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.provider.update({
        where: { id },
        data: { estado: 'ACTIVO' },
      });

      const rootAccountIds = provider.rootAccounts.map((r) => r.id);
      if (rootAccountIds.length > 0) {
        await tx.rootAccount.updateMany({
          where: { id: { in: rootAccountIds } },
          data: { estado: RootAccountStatus.ACTIVA },
        });

        await tx.account.updateMany({
          where: { rootAccountId: { in: rootAccountIds } },
          data: { estado: AccountStatus.OCUPADA },
        });
      }

      // Descongelar días pendientes recalculando nueva fecha de vencimiento
      for (const r of provider.rootAccounts) {
        for (const acc of r.accounts) {
          for (const sub of acc.subscriptions) {
            const nuevaFechaVencimiento = new Date(now.getTime() + sub.diasPendientes * 24 * 60 * 60 * 1000);
            await tx.subscription.update({
              where: { id: sub.id },
              data: {
                estado: SubscriptionStatus.ACTIVA,
                fechaVencimiento: nuevaFechaVencimiento,
                diasPendientes: 0,
                congeladoAt: null,
              },
            });
            reactivadas++;
          }
        }
      }

      // Marcar incidentes abiertos como resueltos
      await tx.rootAccountIncident.updateMany({
        where: { providerId: id, estado: 'ABIERTO' },
        data: { estado: 'RESUELTO', resolvedAt: now },
      });
    });

    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      usuarioNombre: currentUser?.nombre || 'Admin',
      modulo: AuditCategory.SISTEMA,
      accion: 'REACTIVACION_PROVEEDOR',
      severidad: AuditSeverity.SUCCESS,
      descripcion: `Proveedor [${provider.nombre}] REACTIVADO. Se restauraron y descongelaron ${reactivadas} suscripciones.`,
      entidadTipo: 'Provider',
      entidadId: provider.id,
    });

    return {
      message: `Proveedor ${provider.nombre} reactivado exitosamente. ${reactivadas} suscripciones descongeladas.`,
      reactivadas,
    };
  }
}
