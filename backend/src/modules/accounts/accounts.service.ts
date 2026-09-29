import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ImportAccountsDto } from './dto/import-accounts.dto';
import { AccountStatus, SubscriptionStatus, AuditCategory, AuditSeverity } from '@prisma/client';
import { WarrantyService } from '../warranty/warranty.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WarrantyService))
    private warrantyService: WarrantyService,
    private auditService: AuditService,
  ) {}

  // CREAR UNA SOLA CUENTA
  async create(dto: CreateAccountDto) {
    // Verificar que el plan existe
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    // Verificar que no exista duplicada
    const existing = await this.prisma.account.findUnique({
      where: { planId_emailCuenta: { planId: dto.planId, emailCuenta: dto.emailCuenta } },
    });
    if (existing) throw new ConflictException('Esta cuenta ya existe en el inventario');

    const account = await this.prisma.account.create({ data: dto });

    await this.auditService.registrarEvento({
      accion: 'CREACION_CUENTA',
      modulo: AuditCategory.INVENTARIO,
      severidad: AuditSeverity.INFO,
      descripcion: `Nueva cuenta ingresada al inventario: ${account.emailCuenta} (${plan.nombrePlan}) [#ACC-${account.id.substring(0, 8).toUpperCase()}]`,
      entidadTipo: 'Account',
      entidadId: `#ACC-${account.id.substring(0, 8).toUpperCase()}`,
      detalles: { planId: account.planId, email: account.emailCuenta, estado: account.estado },
    });

    // Si la nueva cuenta está DISPONIBLE, auto-asignar a clientes con garantía pendiente de stock
    if (account.estado === AccountStatus.DISPONIBLE) {
      this.warrantyService.processPendingWarrantiesForPlan(account.planId).catch((err) => {
        console.error('Error al procesar garantías pendientes tras crear cuenta:', err);
      });
    }

    return account;
  }

  // IMPORTACIÓN MASIVA (CSV / JSON)
  async importBatch(dto: ImportAccountsDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    let importados = 0;
    let duplicados = 0;
    const errores: string[] = [];

    // Procesar en lotes de 50 para no saturar la BD
    const batchSize = 50;
    for (let i = 0; i < dto.accounts.length; i += batchSize) {
      const batch = dto.accounts.slice(i, i + batchSize);
      
      for (const acc of batch) {
        try {
          await this.prisma.account.create({
            data: {
              planId: dto.planId,
              emailCuenta: acc.emailCuenta,
              passwordCuenta: acc.passwordCuenta,
              perfilAsignado: acc.perfilAsignado,
              pinPerfil: acc.pinPerfil,
              batchId: dto.batchId,
              estado: AccountStatus.DISPONIBLE,
            },
          });
          importados++;
        } catch (error) {
          if (error.code === 'P2002') {
            duplicados++;
          } else {
            errores.push(`Error con ${acc.emailCuenta}: ${error.message}`);
          }
        }
      }
    }

    // Actualizar contador del lote si existe
    if (dto.batchId) {
      await this.prisma.supplierBatch.update({
        where: { id: dto.batchId },
        data: { cantidadCuentas: { increment: importados } },
      });
    }

    // Si se importaron cuentas nuevas, auto-asignar inmediatamente a clientes con garantías en espera
    if (importados > 0) {
      this.warrantyService.processPendingWarrantiesForPlan(dto.planId).catch((err) => {
        console.error('Error al procesar garantías pendientes tras importar lote:', err);
      });
    }

    return {
      message: 'Importación completada',
      resumen: { importados, duplicados, errores: errores.length },
      detallesErrores: errores,
    };
  }

  // OBTENER STOCK DISPONIBLE POR PLAN
  async getStockByPlan(planId: string) {
    const cuentas = await this.prisma.account.findMany({
      where: { planId, estado: AccountStatus.DISPONIBLE },
      select: { id: true, emailCuenta: true, perfilAsignado: true },
    });

    return {
      planId,
      disponibles: cuentas.length,
      cuentas,
    };
  }

  // BUSCAR UNA CUENTA DISPONIBLE (Para asignar en una venta)
  async findAvailableAccount(planId: string) {
    const account = await this.prisma.account.findFirst({
      where: { planId, estado: AccountStatus.DISPONIBLE },
      orderBy: { createdAt: 'asc' }, // FIFO: primero la más antigua
    });

    if (!account) {
      throw new BadRequestException(`No hay stock disponible para el plan ${planId}`);
    }

    return account;
  }

  // MARCAR CUENTA COMO OCUPADA (Al vender)
  async markAsOccupied(accountId: string) {
    return this.prisma.account.update({
      where: { id: accountId },
      data: { estado: AccountStatus.OCUPADA },
    });
  }

  // MARCAR CUENTA COMO DEFECTUOSA (Garantía)
  async markAsDefective(accountId: string, motivo: string) {
    return this.prisma.account.update({
      where: { id: accountId },
      data: { estado: AccountStatus.DEFECTUOSA },
    });
  }

  // LISTAR TODAS LAS CUENTAS (Con filtros)
  async findAll(filters: { planId?: string; estado?: AccountStatus; batchId?: string }) {
    const accounts = await this.prisma.account.findMany({
      where: {
        ...(filters.planId && { planId: filters.planId }),
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.batchId && { batchId: filters.batchId }),
      },
      include: {
        plan: { select: { nombrePlan: true, service: { select: { nombre: true } } } },
        subscriptions: {
          where: { estado: SubscriptionStatus.ACTIVA },
          take: 1,
          select: { customer: { select: { user: { select: { nombre: true, email: true } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map(a => ({
      ...a,
      subscription: a.subscriptions?.[0] || null,
    }));
  }

  // OBTENER DETALLE DE UNA CUENTA
  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        plan: { include: { service: true } },
        subscriptions: {
          where: { estado: SubscriptionStatus.ACTIVA },
          take: 1,
          include: { customer: { include: { user: true } } },
        },
      },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return {
      ...account,
      subscription: account.subscriptions?.[0] || null,
    };
  }

  // ACTUALIZAR PROPIEDADES DE UNA CUENTA
  async update(id: string, dto: {
    planId?: string;
    emailCuenta?: string;
    passwordCuenta?: string;
    perfilAsignado?: string;
    pinPerfil?: string;
    estado?: AccountStatus;
  }) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');

    // Si cambia planId o emailCuenta, verificar que no colisione con otra cuenta
    if (
      (dto.planId && dto.planId !== account.planId) ||
      (dto.emailCuenta && dto.emailCuenta !== account.emailCuenta)
    ) {
      const targetPlanId = dto.planId || account.planId;
      const targetEmail = dto.emailCuenta || account.emailCuenta;
      const existing = await this.prisma.account.findUnique({
        where: { planId_emailCuenta: { planId: targetPlanId, emailCuenta: targetEmail } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe otra cuenta con este correo para este plan');
      }
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.planId && { planId: dto.planId }),
        ...(dto.emailCuenta && { emailCuenta: dto.emailCuenta }),
        ...(dto.passwordCuenta && { passwordCuenta: dto.passwordCuenta }),
        ...(dto.perfilAsignado !== undefined && { perfilAsignado: dto.perfilAsignado }),
        ...(dto.pinPerfil !== undefined && { pinPerfil: dto.pinPerfil }),
        ...(dto.estado && { estado: dto.estado }),
      },
      include: {
        plan: { select: { nombrePlan: true, service: { select: { nombre: true } } } },
      },
    });

    // Auditoría: cambio de estado o credenciales
    if (dto.estado && dto.estado !== account.estado) {
      const severidad =
        dto.estado === AccountStatus.DEFECTUOSA || dto.estado === AccountStatus.BLOQUEADA
          ? AuditSeverity.WARNING
          : AuditSeverity.INFO;

      await this.auditService.registrarEvento({
        accion: 'CAMBIO_ESTADO_CUENTA',
        modulo: AuditCategory.INVENTARIO,
        severidad,
        descripcion: `Estado de cuenta [#ACC-${account.id.substring(0, 8).toUpperCase()}] (${account.emailCuenta}) cambió de ${account.estado} a ${dto.estado}`,
        entidadTipo: 'Account',
        entidadId: `#ACC-${account.id.substring(0, 8).toUpperCase()}`,
        detalles: {
          cuentaId: account.id,
          email: account.emailCuenta,
          estadoAnterior: account.estado,
          nuevoEstado: dto.estado,
        },
      });
    } else if (dto.passwordCuenta && dto.passwordCuenta !== account.passwordCuenta) {
      await this.auditService.registrarEvento({
        accion: 'CAMBIO_PASSWORD_CUENTA',
        modulo: AuditCategory.INVENTARIO,
        severidad: AuditSeverity.WARNING,
        descripcion: `Modificación de contraseña para cuenta [#ACC-${account.id.substring(0, 8).toUpperCase()}] (${account.emailCuenta})`,
        entidadTipo: 'Account',
        entidadId: `#ACC-${account.id.substring(0, 8).toUpperCase()}`,
        detalles: { cuentaId: account.id, email: account.emailCuenta },
      });
    }

    // Si la cuenta cambió o quedó en DISPONIBLE, verificar si hay garantías esperando
    if (updated.estado === AccountStatus.DISPONIBLE) {
      this.warrantyService.processPendingWarrantiesForPlan(updated.planId).catch((err) => {
        console.error('Error al procesar garantías pendientes tras actualizar cuenta a disponible:', err);
      });
    }

    return updated;
  }

  // ELIMINAR CUENTA
  async remove(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');

    await this.auditService.registrarEvento({
      accion: 'ELIMINACION_CUENTA',
      modulo: AuditCategory.INVENTARIO,
      severidad: AuditSeverity.CRITICAL,
      descripcion: `Cuenta [#ACC-${account.id.substring(0, 8).toUpperCase()}] (${account.emailCuenta}) eliminada permanentemente del inventario`,
      entidadTipo: 'Account',
      entidadId: `#ACC-${account.id.substring(0, 8).toUpperCase()}`,
      detalles: { cuentaId: account.id, email: account.emailCuenta, planId: account.planId },
    });

    return this.prisma.account.delete({
      where: { id },
    });
  }
}