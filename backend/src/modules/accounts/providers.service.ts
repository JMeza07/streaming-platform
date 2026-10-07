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

  // LISTAR PROVEEDORES CON MÉTRICAS Y COSTOS
  async getAll() {
    const providers = await this.prisma.provider.findMany({
      include: {
        rootAccounts: {
          select: {
            id: true,
            email: true,
            costoCompra: true,
            estado: true,
            service: { select: { nombre: true } },
            accounts: {
              select: {
                id: true,
                estado: true,
                costoCompra: true,
                plan: { select: { precio: true, nombrePlan: true } },
              },
            },
          },
        },
        batches: {
          orderBy: { fechaCompra: 'desc' },
        },
        incidents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        accounts: {
          select: {
            id: true,
            estado: true,
            costoCompra: true,
            plan: { select: { precio: true } },
          },
        },
        _count: {
          select: {
            rootAccounts: true,
            batches: true,
            incidents: true,
            accounts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular analíticas financieras por proveedor
    return providers.map((prov) => {
      let totalCostoInvertido = 0;
      let totalVentaPotencial = 0;
      let cuentasTotales = 0;
      let cuentasActivas = 0;

      // 1. Costos de cuentas raíz
      prov.rootAccounts.forEach((ra) => {
        const costoRaiz = Number(ra.costoCompra || 0);
        totalCostoInvertido += costoRaiz;

        ra.accounts.forEach((acc) => {
          cuentasTotales++;
          if (acc.estado === AccountStatus.OCUPADA) cuentasActivas++;
          const precioVenta = Number(acc.plan?.precio || 0);
          totalVentaPotencial += precioVenta;
        });
      });

      // 2. Costos de perfiles/cuentas individuales directas
      prov.accounts.forEach((acc) => {
        cuentasTotales++;
        if (acc.estado === AccountStatus.OCUPADA) cuentasActivas++;
        totalCostoInvertido += Number(acc.costoCompra || 0);
        totalVentaPotencial += Number(acc.plan?.precio || 0);
      });

      // 3. Costos de lotes
      const costoLotes = prov.batches.reduce((acc, b) => acc + Number(b.costoTotalLote || 0), 0);
      if (costoLotes > totalCostoInvertido) {
        totalCostoInvertido = costoLotes;
      }

      const margenGananciaEstimada = totalVentaPotencial - totalCostoInvertido;
      const roi = totalCostoInvertido > 0 ? (margenGananciaEstimada / totalCostoInvertido) * 100 : 0;

      return {
        ...prov,
        metricas: {
          totalCostoInvertido,
          totalVentaPotencial,
          margenGananciaEstimada,
          roi: Math.round(roi * 100) / 100,
          cuentasTotales,
          cuentasActivas,
        },
      };
    });
  }

  // OBTENER UNO CON DETALLES COMPLETOS
  async getById(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        rootAccounts: {
          include: {
            accounts: {
              include: {
                plan: true,
                subscriptions: {
                  where: { estado: SubscriptionStatus.ACTIVA },
                  include: { customer: { include: { user: true } } },
                },
              },
            },
            service: true,
          },
        },
        accounts: {
          include: {
            plan: { include: { service: true } },
            subscriptions: {
              where: { estado: SubscriptionStatus.ACTIVA },
              include: { customer: { include: { user: true } } },
            },
          },
        },
        incidents: {
          orderBy: { createdAt: 'desc' },
        },
        batches: {
          include: {
            accounts: {
              include: { plan: true },
            },
          },
          orderBy: { fechaCompra: 'desc' },
        },
      },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    // Calcular rentabilidad y métricas del proveedor
    let totalCosto = 0;
    let totalIngresosEstimados = 0;

    provider.rootAccounts.forEach((ra) => {
      totalCosto += Number(ra.costoCompra || 0);
      ra.accounts.forEach((acc) => {
        totalIngresosEstimados += Number(acc.plan?.precio || 0);
      });
    });

    provider.accounts.forEach((acc) => {
      totalCosto += Number(acc.costoCompra || 0);
      totalIngresosEstimados += Number(acc.plan?.precio || 0);
    });

    const costoLotes = provider.batches.reduce((sum, b) => sum + Number(b.costoTotalLote || 0), 0);
    if (costoLotes > totalCosto) {
      totalCosto = costoLotes;
    }

    const margen = totalIngresosEstimados - totalCosto;
    const margenPorcentaje = totalCosto > 0 ? (margen / totalCosto) * 100 : 0;

    return {
      ...provider,
      metricas: {
        totalInvertido: totalCosto,
        totalVentaProyectada: totalIngresosEstimados,
        margenGanancia: margen,
        margenPorcentaje: Math.round(margenPorcentaje * 100) / 100,
      },
    };
  }

  // CREAR PROVEEDOR
  async create(data: { nombre: string; contacto?: string; telefono?: string; email?: string; notas?: string }) {
    const existing = await this.prisma.provider.findUnique({ where: { nombre: data.nombre.trim() } });
    if (existing) throw new BadRequestException('Ya existe un proveedor con este nombre');

    const provider = await this.prisma.provider.create({
      data: {
        nombre: data.nombre.trim(),
        contacto: data.contacto,
        telefono: data.telefono,
        email: data.email,
        notas: data.notas,
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
  async update(id: string, data: { nombre?: string; contacto?: string; telefono?: string; email?: string; estado?: string; notas?: string }) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    return this.prisma.provider.update({
      where: { id },
      data,
    });
  }

  // REGISTRAR COMPRA DE LOTE / BATCH AL PROVEEDOR
  async createBatch(providerId: string, data: {
    costoTotalLote: number;
    cantidadCuentas: number;
    fechaCompra?: string;
    cuentas?: Array<{
      planId: string;
      emailCuenta: string;
      passwordCuenta: string;
      perfilAsignado?: string;
      pinPerfil?: string;
      costoCompra?: number;
    }>;
  }) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const fechaCompra = data.fechaCompra ? new Date(data.fechaCompra) : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Crear el lote de compra
      const batch = await tx.supplierBatch.create({
        data: {
          providerId,
          proveedorNombre: provider.nombre,
          fechaCompra,
          costoTotalLote: data.costoTotalLote,
          cantidadCuentas: data.cantidadCuentas || (data.cuentas?.length || 0),
          estadoLote: 'activo',
        },
      });

      // 2. Si vienen cuentas para insertar de inmediato
      let cuentasCreadas = 0;
      if (Array.isArray(data.cuentas) && data.cuentas.length > 0) {
        const costoUnitarioPorDefecto = data.cantidadCuentas > 0 ? Number(data.costoTotalLote) / data.cantidadCuentas : 0;

        for (const item of data.cuentas) {
          await tx.account.create({
            data: {
              planId: item.planId,
              emailCuenta: item.emailCuenta,
              passwordCuenta: item.passwordCuenta,
              perfilAsignado: item.perfilAsignado,
              pinPerfil: item.pinPerfil,
              assignedPin: item.pinPerfil,
              costoCompra: item.costoCompra !== undefined ? item.costoCompra : costoUnitarioPorDefecto,
              batchId: batch.id,
              providerId: provider.id,
              estado: AccountStatus.DISPONIBLE,
            },
          });
          cuentasCreadas++;
        }
      }

      return { batch, cuentasCreadas };
    });

    await this.auditService.registrarEvento({
      modulo: AuditCategory.FINANZAS,
      accion: 'COMPRA_LOTE_PROVEEDOR',
      severidad: AuditSeverity.INFO,
      descripcion: `Compra de lote registrada para proveedor [${provider.nombre}]: Costo $${data.costoTotalLote}, ${data.cantidadCuentas} cuentas adquiridas.`,
      entidadTipo: 'SupplierBatch',
      entidadId: result.batch.id,
    });

    return result;
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

  // =========================================================================
  // SRS REQ. ADICIONAL 9 (PUNTO 26): AUTOCOMPLETADO DE PROVEEDORES
  // =========================================================================
  async getAutocomplete() {
    const providers = await this.prisma.provider.findMany({
      where: { estado: 'ACTIVO' },
      select: {
        id: true,
        nombre: true,
        contacto: true,
        telefono: true,
        tasaFallo: true,
        estado: true,
      },
      orderBy: { nombre: 'asc' },
    });

    return providers.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      contacto: p.contacto,
      telefono: p.telefono,
      tasaFallo: Number(p.tasaFallo || 0),
      label: `${p.nombre}${p.contacto ? ` (${p.contacto})` : ''}`,
    }));
  }

  // =========================================================================
  // SRS RF-024 (PUNTO 17): PRECIOS DE PROVEEDOR POR PLATAFORMA
  // =========================================================================
  async getPrices(providerId?: string, serviceId?: string) {
    const where: any = { activo: true };
    if (providerId) where.providerId = providerId;
    if (serviceId) where.serviceId = serviceId;

    return this.prisma.providerPrice.findMany({
      where,
      include: {
        provider: { select: { id: true, nombre: true, estado: true, tasaFallo: true } },
        service: { select: { id: true, nombre: true, logoUrl: true } },
        plan: { select: { id: true, nombrePlan: true, precio: true } },
      },
      orderBy: [{ service: { nombre: 'asc' } }, { precio: 'asc' }],
    });
  }

  async savePrice(data: {
    providerId: string;
    serviceId?: string;
    planId?: string;
    precio: number;
    duracionDias?: number;
    moneda?: string;
    notas?: string;
  }) {
    if (!data.providerId || !data.precio) {
      throw new BadRequestException('El ID del proveedor y el precio son obligatorios.');
    }

    // Si no se proporciona serviceId pero sí planId, buscar el serviceId del plan
    let serviceId = data.serviceId;
    if (!serviceId && data.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: data.planId } });
      if (plan) serviceId = plan.serviceId;
    }

    return this.prisma.providerPrice.create({
      data: {
        providerId: data.providerId,
        serviceId: serviceId || null,
        planId: data.planId || null,
        precio: data.precio,
        duracionDias: data.duracionDias || 30,
        moneda: data.moneda || 'COP',
        notas: data.notas || null,
      },
      include: {
        provider: { select: { id: true, nombre: true } },
        service: { select: { id: true, nombre: true } },
        plan: { select: { id: true, nombrePlan: true } },
      },
    });
  }

  async deletePrice(id: string) {
    return this.prisma.providerPrice.update({
      where: { id },
      data: { activo: false },
    });
  }

  async getBestRatesByService() {
    const services = await this.prisma.service.findMany({
      where: { activo: true },
      include: {
        plans: {
          where: { activo: true },
          orderBy: { precio: 'asc' },
        },
        providerPrices: {
          where: { activo: true, provider: { estado: 'ACTIVO' } },
          include: {
            provider: { select: { id: true, nombre: true, tasaFallo: true } },
          },
          orderBy: { precio: 'asc' },
        },
      },
    });

    return services.map((s) => {
      const bestPrice = s.providerPrices[0] || null;
      const defaultPlan = s.plans[0] || null;
      const costoProveedor = bestPrice ? Number(bestPrice.precio) : 0;
      const precioVentaPublico = defaultPlan ? Number(defaultPlan.precio) : 0;
      const margenNeto = precioVentaPublico > 0 && costoProveedor > 0 ? precioVentaPublico - costoProveedor : 0;
      const porcentajeMargen = precioVentaPublico > 0 ? ((margenNeto / precioVentaPublico) * 100).toFixed(1) : '0';

      return {
        serviceId: s.id,
        serviceNombre: s.nombre,
        logoUrl: s.logoUrl,
        mejorProveedor: bestPrice
          ? {
              id: bestPrice.provider.id,
              nombre: bestPrice.provider.nombre,
              tasaFallo: Number(bestPrice.provider.tasaFallo),
              costo: costoProveedor,
              duracionDias: bestPrice.duracionDias,
              moneda: bestPrice.moneda,
            }
          : null,
        precioVentaPVP: precioVentaPublico,
        margenEstimadoCOP: margenNeto,
        porcentajeMargen: Number(porcentajeMargen),
        totalProveedoresDisponibles: s.providerPrices.length,
      };
    });
  }
}

