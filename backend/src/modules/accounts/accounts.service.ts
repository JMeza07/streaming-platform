import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ImportAccountsDto } from './dto/import-accounts.dto';
import { AddToCemeteryDto } from './dto/cemetery.dto';
import { RenewRootAccountDto } from './dto/renew-root-account.dto';
import { calculateSgvsState } from '../../common/utils/sgvs-status.util';
import { AccountStatus, SubscriptionStatus, AuditCategory, AuditSeverity, RootAccountStatus } from '@prisma/client';
import { WarrantyService } from '../warranty/warranty.service';
import { AuditService } from '../audit/audit.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import * as cron from 'node-cron';

@Injectable()
export class AccountsService implements OnModuleInit {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WarrantyService))
    private warrantyService: WarrantyService,
    private auditService: AuditService,
    private whatsappService: WhatsappService,
  ) {}

  onModuleInit() {
    this.scheduleBusinessLogicCrons();
  }

  // =========================================================================
  // TAREAS AUTOMÁTICAS (CRON JOBS PARA LÓGICA DE NEGOCIO)
  // =========================================================================
  private scheduleBusinessLogicCrons() {
    // 1. ESCENARIO 8: Liberar reservas TTL de 15 minutos expiradas (cada minuto)
    cron.schedule('* * * * *', async () => {
      try {
        await this.releaseExpiredReservations();
      } catch (err: any) {
        this.logger.error(`Error liberando reservas TTL: ${err.message}`);
      }
    });

    // 2. ESCENARIO 6 & 11: Retención de 24h y rotación de credenciales (cada hora)
    cron.schedule('0 * * * *', async () => {
      try {
        await this.process24hGracePeriodExpirations();
      } catch (err: any) {
        this.logger.error(`Error procesando expiraciones 24h: ${err.message}`);
      }
    });

    // 3. ESCENARIO 4: Chequeo diario de descalce de ciclo de facturación (a las 09:00 AM)
    cron.schedule('0 9 * * *', async () => {
      try {
        await this.checkBillingCycleMismatches();
      } catch (err: any) {
        this.logger.error(`Error verificando descalces de ciclo: ${err.message}`);
      }
    });

    // 4. ESCENARIO 10: Optimización semanal de inventario / Bin Packing (Domingos 02:00 AM)
    cron.schedule('0 2 * * 0', async () => {
      try {
        this.logger.log('Iniciando optimización semanal de inventario (Bin Packing)...');
        await this.optimizeInventory({ autoMigrate: false });
      } catch (err: any) {
        this.logger.error(`Error en optimización semanal de inventario: ${err.message}`);
      }
    });
  }

  // =========================================================================
  // ESCENARIO 8: LIBERAR RESERVAS TTL (15 MINUTOS) EXPIRADAS
  // =========================================================================
  async releaseExpiredReservations() {
    const now = new Date();
    const expired = await this.prisma.account.updateMany({
      where: {
        estado: AccountStatus.PENDIENTE_PAGO,
        reservedUntil: { lt: now },
      },
      data: {
        estado: AccountStatus.DISPONIBLE,
        reservedUntil: null,
        reservedByCustomerId: null,
      },
    });

    if (expired.count > 0) {
      this.logger.log(`[TTL Cron] Se liberaron ${expired.count} perfiles con reserva expirada a DISPONIBLE.`);
    }
    return expired.count;
  }

  // =========================================================================
  // ESCENARIOS 6 Y 11: RETENCIÓN 24H Y CONTROL DE FUGA (LEAKAGE)
  // =========================================================================
  async process24hGracePeriodExpirations() {
    const now = new Date();

    // A. Identificar suscripciones que acaban de expirar y mover perfil a RETENIDA_24H
    const vencidasSinRetencion = await this.prisma.subscription.findMany({
      where: {
        estado: SubscriptionStatus.ACTIVA,
        fechaVencimiento: { lte: now },
      },
      include: { account: true },
    });

    for (const sub of vencidasSinRetencion) {
      await this.prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { estado: SubscriptionStatus.VENCIDA },
        });

        if (sub.account && sub.account.estado === AccountStatus.OCUPADA) {
          await tx.account.update({
            where: { id: sub.account.id },
            data: { estado: AccountStatus.RETENIDA_24H },
          });
        }
      });
    }

    // B. Procesar perfiles en RETENIDA_24H cuya suscripción venció hace más de 24 horas
    const unDiaAtras = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const retenidasVencidas = await this.prisma.subscription.findMany({
      where: {
        estado: SubscriptionStatus.VENCIDA,
        fechaVencimiento: { lte: unDiaAtras },
        account: { estado: AccountStatus.RETENIDA_24H },
      },
      include: { account: { include: { rootAccount: true } } },
    });

    for (const sub of retenidasVencidas) {
      const account = sub.account;
      if (!account) continue;

      // ESCENARIO 11: Verificar si quedan otros clientes pagando en la misma cuenta raíz
      let otrosClientesActivos = 0;
      if (account.rootAccountId) {
        otrosClientesActivos = await this.prisma.account.count({
          where: {
            rootAccountId: account.rootAccountId,
            id: { not: account.id },
            estado: AccountStatus.OCUPADA,
          },
        });
      }

      await this.prisma.$transaction(async (tx) => {
        if (otrosClientesActivos > 0 && account.rootAccountId) {
          // Requiere rotación de contraseña: mover a CUARENTENA y no dejar público
          await tx.rootAccount.update({
            where: { id: account.rootAccountId },
            data: { requiresPasswordChange: true },
          });

          await tx.account.update({
            where: { id: account.id },
            data: { estado: AccountStatus.CUARENTENA },
          });

          this.logger.warn(
            `[Escenario 11] Cuenta raíz ${account.rootAccountId} requiere cambio de clave. Perfil ${account.id} retenido en CUARENTENA.`,
          );
        } else {
          // Si no hay otros clientes activos en esa cuenta raíz, puede volver a DISPONIBLE
          await tx.account.update({
            where: { id: account.id },
            data: { estado: AccountStatus.DISPONIBLE },
          });
        }
      });
    }
  }

  // =========================================================================
  // ESCENARIO 4: VERIFICAR DESFASES DE CICLO DE FACTURACIÓN (< 3 DÍAS)
  // =========================================================================
  async checkBillingCycleMismatches() {
    const ahora = new Date();
    const en3Dias = new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Cuentas raíz que vencen en menos de 3 días (o ya vencieron)
    const rootAccountsProntas = await this.prisma.rootAccount.findMany({
      where: {
        fechaVencimientoRaiz: { lte: en3Dias },
        estado: { notIn: [RootAccountStatus.CAIDA, RootAccountStatus.NO_RENOVAR] },
      },
      include: {
        service: true,
        accounts: {
          include: {
            subscriptions: {
              where: { estado: SubscriptionStatus.ACTIVA },
              include: { customer: { include: { user: true } } },
            },
          },
        },
      },
    });

    const mismatches: any[] = [];

    for (const root of rootAccountsProntas) {
      if (!root.fechaVencimientoRaiz) continue;

      // Buscar si tiene clientes cuyas suscripciones superan la fecha de vencimiento de la raíz
      const clientesEnRiesgo: any[] = [];

      root.accounts.forEach((acc) => {
        acc.subscriptions.forEach((sub) => {
          if (new Date(sub.fechaVencimiento) > new Date(root.fechaVencimientoRaiz!)) {
            clientesEnRiesgo.push({
              clienteNombre: sub.customer.user.nombre,
              whatsapp: sub.customer.whatsapp,
              suscripcionFin: sub.fechaVencimiento,
              perfil: acc.perfilAsignado,
            });
          }
        });
      });

      if (clientesEnRiesgo.length > 0) {
        mismatches.push({
          rootAccountId: root.id,
          emailRaiz: root.email,
          servicio: root.service?.nombre || 'Streaming',
          fechaVencimientoRaiz: root.fechaVencimientoRaiz,
          clientesAfectados: clientesEnRiesgo.length,
          detalleClientes: clientesEnRiesgo,
          prioridad: 'ALERTA_RENOVACION_PRIORITARIA',
        });
      }
    }

    return mismatches;
  }

  // =========================================================================
  // GESTIÓN DE CUENTAS RAÍZ (ROOT ACCOUNTS / CUENTAS_RAIZ)
  // =========================================================================
  async createRootAccount(data: {
    email: string;
    password: string;
    serviceId?: string;
    providerId?: string;
    planId?: string;
    tipoVenta?: 'POR_PANTALLA' | 'COMPLETA'; // Flexibilidad híbrida mayorista/minorista
    generateProfiles?: boolean;
    fechaVencimientoRaiz?: string | Date;
    costoCompra?: number;
    maxPerfiles?: number;
    diaFacturacion?: number;
    alertaFacturacionDias?: number;
    metodoPagoProveedor?: string;
    imapHost?: string;
    imapPort?: number;
    imapUser?: string;
    imapPassword?: string;
    imapSecure?: boolean;
  }) {
    const emailRaiz = data.email.trim();

    // Verificación bloqueante de Lista Negra / Cementerio de Cuentas (SRS SGVS RF-027, RF-035, RF-011)
    const inCemetery = await this.prisma.cemeteryAccount.findUnique({ where: { email: emailRaiz } });
    if (inCemetery) {
      throw new BadRequestException(
        `El correo "${emailRaiz}" se encuentra registrado en el Cementerio de Cuentas / Lista Negra y no puede ser reactivado. Motivo: ${inCemetery.motivoBaja}`,
      );
    }

    const existing = await this.prisma.rootAccount.findUnique({ where: { email: emailRaiz } });
    if (existing) throw new ConflictException('Esta cuenta raíz ya existe');

    const maxPerfiles = data.maxPerfiles || 5;
    const tipoVenta = data.tipoVenta || 'POR_PANTALLA';

    // Generar unidades de venta según modelo de negocio híbrido
    let perfilesACrear: any[] = [];

    if (data.planId && data.generateProfiles !== false) {
      if (tipoVenta === 'COMPLETA') {
        // Escenario B: Venta de Cuenta Completa (1 sola unidad de venta que abarca toda la cuenta)
        perfilesACrear = [
          {
            planId: data.planId,
            providerId: data.providerId || null,
            emailCuenta: emailRaiz,
            passwordCuenta: data.password,
            perfilAsignado: 'Cuenta Completa (Todas las pantallas)',
            estado: AccountStatus.DISPONIBLE,
            costoCompra: data.costoCompra ? Number(data.costoCompra) : 0,
          },
        ];
      } else {
        // Escenario A: Venta por Pantallas Individuales (N registros independientes para N clientes)
        perfilesACrear = Array.from({ length: maxPerfiles }).map((_, index) => ({
          planId: data.planId!,
          providerId: data.providerId || null,
          emailCuenta: emailRaiz,
          passwordCuenta: data.password,
          perfilAsignado: `Pantalla ${index + 1}`,
          estado: AccountStatus.DISPONIBLE,
          costoCompra: data.costoCompra ? Number(data.costoCompra) / maxPerfiles : 0,
        }));
      }
    }

    const rootAccount = await this.prisma.rootAccount.create({
      data: {
        email: emailRaiz,
        password: data.password,
        serviceId: data.serviceId,
        providerId: data.providerId,
        fechaVencimientoRaiz: data.fechaVencimientoRaiz ? new Date(data.fechaVencimientoRaiz) : null,
        costoCompra: data.costoCompra !== undefined ? data.costoCompra : 0,
        maxPerfiles: maxPerfiles,
        diaFacturacion: data.diaFacturacion || null,
        alertaFacturacionDias: data.alertaFacturacionDias || 5,
        metodoPagoProveedor: data.metodoPagoProveedor || null,
        imapHost: data.imapHost,
        imapPort: data.imapPort || 993,
        imapUser: data.imapUser,
        imapPassword: data.imapPassword,
        imapSecure: data.imapSecure !== false,
        estado: RootAccountStatus.ACTIVA,
        ...(perfilesACrear.length > 0 && {
          accounts: {
            create: perfilesACrear,
          },
        }),
      },
      include: {
        service: true,
        provider: true,
        accounts: true,
      },
    });

    if (perfilesACrear.length > 0 && data.planId) {
      this.warrantyService.processPendingWarrantiesForPlan(data.planId).catch((err) => {
        this.logger.error(`Error procesando garantías tras generar stock de pantallas: ${err.message}`);
      });
    }

    await this.auditService.registrarEvento({
      modulo: AuditCategory.INVENTARIO,
      accion: 'CREACION_CUENTA_RAIZ',
      severidad: AuditSeverity.INFO,
      descripcion: `Nueva cuenta raíz registrada: ${rootAccount.email}. Stock generado: ${rootAccount.accounts?.length || 0} pantallas disponibles.`,
      entidadTipo: 'RootAccount',
      entidadId: rootAccount.id,
    });

    return rootAccount;
  }

  async getRootAccounts(filters?: { serviceId?: string; providerId?: string; estado?: RootAccountStatus }) {
    const rootAccounts = await this.prisma.rootAccount.findMany({
      where: {
        ...(filters?.serviceId && { serviceId: filters.serviceId }),
        ...(filters?.providerId && { providerId: filters.providerId }),
        ...(filters?.estado && { estado: filters.estado }),
      },
      include: {
        service: true,
        provider: true,
        accounts: {
          select: {
            id: true,
            perfilAsignado: true,
            estado: true,
            assignedPin: true,
            subscriptions: {
              where: { estado: SubscriptionStatus.ACTIVA },
              select: {
                id: true,
                fechaInicio: true,
                fechaVencimiento: true,
                fechaUltimoCambioClave: true,
                estadoLibre: true,
                clase: true,
                customer: { select: { user: { select: { nombre: true, email: true } } } },
              },
            },
          },
        },
        _count: { select: { accounts: true, incidents: true, infractions: true, passwordChanges: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enriquecer en tiempo real con el estado SGVS de cada perfil / cuenta (RN-004 y F1.4.1)
    return rootAccounts.map((root) => {
      const perfilesCalculados = root.accounts.map((acc) => {
        const sub = acc.subscriptions[0];
        let sgvsInfo = null;
        if (sub && sub.fechaVencimiento) {
          sgvsInfo = calculateSgvsState({
            fechaVencimiento: sub.fechaVencimiento,
            fechaInicio: sub.fechaInicio,
            fechaUltimoCambioClave: sub.fechaUltimoCambioClave,
            estadoSuscripcion: acc.estado,
          });
        }
        return {
          ...acc,
          sgvsState: sgvsInfo,
        };
      });

      return {
        ...root,
        accounts: perfilesCalculados,
      };
    });
  }

  // =========================================================================
  // ESCENARIO 2: CAÍDA DE CUENTA RAÍZ (SUSPENSIÓN O BAN)
  // =========================================================================
  async markRootAccountDown(id: string, reason: string, currentUser: any) {
    const root = await this.prisma.rootAccount.findUnique({
      where: { id },
      include: {
        accounts: {
          include: {
            subscriptions: {
              where: { estado: SubscriptionStatus.ACTIVA },
              include: { customer: { include: { user: true } }, plan: { include: { service: true } } },
            },
          },
        },
      },
    });

    if (!root) throw new NotFoundException('Cuenta raíz no encontrada');

    const now = new Date();
    let clientesAfectados = 0;

    await this.prisma.$transaction(async (tx) => {
      // 1. Cambiar estado a CAIDA
      await tx.rootAccount.update({
        where: { id },
        data: { estado: RootAccountStatus.CAIDA },
      });

      // 2. Marcar perfiles como DEFECTUOSA
      await tx.account.updateMany({
        where: { rootAccountId: id },
        data: { estado: AccountStatus.DEFECTUOSA },
      });

      // 3. Congelar días restantes y pasar a EN_GARANTIA
      for (const acc of root.accounts) {
        for (const sub of acc.subscriptions) {
          const vencimiento = new Date(sub.fechaVencimiento);
          const diasRestantes = Math.max(0, Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              estado: SubscriptionStatus.EN_GARANTIA,
              diasPendientes: diasRestantes,
              congeladoAt: now,
            },
          });
          clientesAfectados++;
        }
      }

      // 4. Crear registro de incidente
      await tx.rootAccountIncident.create({
        data: {
          rootAccountId: id,
          providerId: root.providerId,
          titulo: `Caída de cuenta raíz: ${root.email}`,
          descripcion: reason || 'Bloqueo o suspensión de plataforma',
          cuentasAfectadas: root.accounts.length,
          clientesAfectados,
          estado: 'ABIERTO',
        },
      });
    });

    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      modulo: AuditCategory.INVENTARIO,
      accion: 'CAIDA_CUENTA_RAIZ',
      severidad: AuditSeverity.CRITICAL,
      descripcion: `Cuenta raíz [${root.email}] marcada como CAÍDA. ${clientesAfectados} clientes puestos en garantía con días congelados. Motivo: ${reason}`,
      entidadTipo: 'RootAccount',
      entidadId: root.id,
    });

    return {
      message: `Cuenta raíz ${root.email} marcada como CAÍDA. Se congelaron ${clientesAfectados} clientes en garantía y cola de reemplazo.`,
      clientesAfectados,
    };
  }

  // =========================================================================
  // ESCENARIOS 3 Y 5: ACTUALIZAR CONTRASEÑA RAÍZ Y NOTIFICACIÓN PROACTIVA SELECTIVA
  // =========================================================================
  async updateRootAccountPassword(
    id: string,
    newPassword: string,
    currentUser: any,
    excludeCustomerId?: string, // Para excluir al infractor si es por reporte de pantallas
  ) {
    const root = await this.prisma.rootAccount.findUnique({
      where: { id },
      include: {
        service: true,
        accounts: {
          include: {
            subscriptions: {
              where: { estado: SubscriptionStatus.ACTIVA },
              include: { customer: { include: { user: true } }, plan: true },
            },
          },
        },
      },
    });

    if (!root) throw new NotFoundException('Cuenta raíz no encontrada');

    // 1. Notificar proactivamente a clientes legítimos (excluyendo infractor si aplica)
    const notificados: string[] = [];
    const accountIds = root.accounts.map((a) => a.id);

    for (const acc of root.accounts) {
      for (const sub of acc.subscriptions) {
        if (excludeCustomerId && sub.customerId === excludeCustomerId) {
          this.logger.log(`Excluyendo al infractor ${sub.customer.user.nombre} (${sub.customerId}) del envío de contraseña.`);
          continue;
        }

        const phone = sub.customer.whatsapp || sub.customer.user.phone;
        const nombre = sub.customer.user.nombre;
        const servicio = root.service?.nombre || 'Streaming';
        const perfil = acc.perfilAsignado || 'Principal';
        const pin = acc.assignedPin || acc.pinPerfil;

        const mensaje = `Hola ${nombre} 👋,\n\nTe informamos que por motivos de seguridad y mantenimiento hemos actualizado la contraseña de tu cuenta de *${servicio}*:\n\n📧 Correo: ${root.email}\n🔑 Nueva Contraseña: ${newPassword}\n👤 Tu Perfil: ${perfil}${pin ? `\n🔢 PIN: ${pin}` : ''}\n\n⚠️ Por favor utiliza estas nuevas credenciales para ingresar. ¡Gracias por tu preferencia! ✨`;

        if (phone) {
          this.whatsappService.sendTextMessage(phone, mensaje).catch((err) => {
            this.logger.error(`Error enviando WhatsApp de nueva contraseña a ${phone}: ${err.message}`);
          });
          notificados.push(nombre);
        }
      }
    }

    // 2. Actualizar contraseña en BD, registrar historial en PasswordChange y actualizar fecha en suscripciones
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.rootAccount.update({
        where: { id },
        data: {
          password: newPassword,
          requiresPasswordChange: false,
          estado: RootAccountStatus.ACTIVA,
        },
      });

      await tx.account.updateMany({
        where: { rootAccountId: id },
        data: { passwordCuenta: newPassword },
      });

      if (accountIds.length > 0) {
        await tx.subscription.updateMany({
          where: {
            accountId: { in: accountIds },
            estado: SubscriptionStatus.ACTIVA,
          },
          data: {
            fechaUltimoCambioClave: now,
          },
        });
      }

      await tx.passwordChange.create({
        data: {
          rootAccountId: id,
          asesorId: currentUser?.id || currentUser?.userId || null,
          asesorNombre: currentUser?.nombre || null,
          claveAnterior: root.password,
          claveNueva: newPassword,
          motivo: 'Actualización periódica / mantenimiento de seguridad SGVS',
          clientesNotificados: notificados.length,
        },
      });
    });

    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      modulo: AuditCategory.INVENTARIO,
      accion: 'ACTUALIZACION_PASSWORD_RAIZ',
      severidad: AuditSeverity.WARNING,
      descripcion: `Contraseña actualizada para cuenta raíz [${root.email}]. Notificados proactivamente ${notificados.length} clientes legítimos.`,
      entidadTipo: 'RootAccount',
      entidadId: root.id,
    });

    return {
      message: `Contraseña actualizada con éxito y enviada a ${notificados.length} clientes legítimos.`,
      clientesNotificados: notificados,
    };
  }

  // =========================================================================
  // CONVERSIÓN DINÁMICA DE INVENTARIO (POR PANTALLA <-> CUENTA COMPLETA)
  // =========================================================================
  async convertInventoryType(
    rootAccountId: string,
    targetType: 'POR_PANTALLA' | 'COMPLETA',
    targetPlanId: string,
    currentUser: any,
  ) {
    const root = await this.prisma.rootAccount.findUnique({
      where: { id: rootAccountId },
      include: {
        accounts: {
          include: {
            subscriptions: {
              where: { estado: SubscriptionStatus.ACTIVA },
            },
          },
        },
      },
    });

    if (!root) throw new NotFoundException('Cuenta raíz no encontrada');

    // Verificar si tiene suscripciones activas
    const tieneClientesActivos = root.accounts.some((a) => a.subscriptions.length > 0);
    if (tieneClientesActivos) {
      throw new BadRequestException(
        'No se puede convertir dinámicamente una cuenta que ya tiene perfiles con clientes activos.',
      );
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: targetPlanId } });
    if (!plan) throw new NotFoundException('Plan de destino no encontrado');

    const maxPerfiles = root.maxPerfiles || 5;

    await this.prisma.$transaction(async (tx) => {
      // 1. Eliminar los registros de venta actuales que están en DISPONIBLE
      await tx.account.deleteMany({
        where: { rootAccountId },
      });

      // 2. Crear las nuevas unidades de venta según el tipo objetivo
      if (targetType === 'COMPLETA') {
        await tx.account.create({
          data: {
            planId: targetPlanId,
            rootAccountId,
            providerId: root.providerId,
            emailCuenta: root.email,
            passwordCuenta: root.password,
            perfilAsignado: 'Cuenta Completa (Todas las pantallas)',
            estado: AccountStatus.DISPONIBLE,
            costoCompra: root.costoCompra ? Number(root.costoCompra) : 0,
          },
        });
      } else {
        const perfiles = Array.from({ length: maxPerfiles }).map((_, index) => ({
          planId: targetPlanId,
          rootAccountId,
          providerId: root.providerId,
          emailCuenta: root.email,
          passwordCuenta: root.password,
          perfilAsignado: `Pantalla ${index + 1}`,
          estado: AccountStatus.DISPONIBLE,
          costoCompra: root.costoCompra ? Number(root.costoCompra) / maxPerfiles : 0,
        }));

        await tx.account.createMany({
          data: perfiles,
        });
      }
    });

    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      modulo: AuditCategory.INVENTARIO,
      accion: 'CONVERSION_INVENTARIO',
      severidad: AuditSeverity.INFO,
      descripcion: `Cuenta raíz [${root.email}] convertida dinámicamente a modalidad ${targetType}.`,
      entidadTipo: 'RootAccount',
      entidadId: root.id,
    });

    return {
      message: `Cuenta raíz convertida con éxito a modalidad ${targetType}.`,
      targetType,
    };
  }

  // =========================================================================
  // ESCENARIO 11: CONFIRMAR ROTACIÓN DE CONTRASEÑA POST-VENCIMIENTO
  // =========================================================================
  async confirmPasswordRotation(rootAccountId: string, newPassword: string, currentUser: any) {
    const root = await this.prisma.rootAccount.findUnique({
      where: { id: rootAccountId },
      include: {
        accounts: {
          where: { estado: AccountStatus.CUARENTENA },
        },
      },
    });

    if (!root) throw new NotFoundException('Cuenta raíz no encontrada');

    // 1. Actualizar contraseña y notificar a activos
    await this.updateRootAccountPassword(rootAccountId, newPassword, currentUser);

    // 2. Liberar perfiles en cuarentena a DISPONIBLE
    const liberados = await this.prisma.account.updateMany({
      where: {
        rootAccountId,
        estado: AccountStatus.CUARENTENA,
      },
      data: { estado: AccountStatus.DISPONIBLE },
    });

    return {
      message: `Rotación de credenciales confirmada. Se liberaron ${liberados.count} perfiles al inventario público.`,
      perfilesLiberados: liberados.count,
    };
  }

  // =========================================================================
  // ESCENARIO 10: OPTIMIZACIÓN DE INVENTARIO (BIN PACKING / DEFRAGMENTACIÓN)
  // =========================================================================
  async optimizeInventory(options?: { autoMigrate?: boolean }) {
    // Buscar todas las cuentas raíz activas con sus perfiles
    const rootAccounts = await this.prisma.rootAccount.findMany({
      where: {
        estado: RootAccountStatus.ACTIVA,
      },
      include: {
        service: true,
        accounts: {
          include: {
            subscriptions: {
              where: { estado: SubscriptionStatus.ACTIVA },
              include: { customer: { include: { user: true } }, plan: true },
            },
          },
        },
      },
    });

    // Agrupar por serviceId
    const porServicio: Record<string, typeof rootAccounts> = {};
    for (const r of rootAccounts) {
      const sId = r.serviceId || 'unknown';
      if (!porServicio[sId]) porServicio[sId] = [];
      porServicio[sId].push(r);
    }

    const migracionesPropuestas: any[] = [];
    const cuentasParaDesactivar: string[] = [];

    for (const [servicioId, cuentas] of Object.entries(porServicio)) {
      // Separar cuentas por nivel de ocupación
      const calculadas = cuentas.map((c) => {
        const perfilesOcupados = c.accounts.filter((a) => a.estado === AccountStatus.OCUPADA).length;
        const perfilesDisponibles = c.accounts.filter((a) => a.estado === AccountStatus.DISPONIBLE);
        return {
          root: c,
          ocupados: perfilesOcupados,
          capacidad: c.maxPerfiles,
          disponibles: perfilesDisponibles,
          tasaOcupacion: perfilesOcupados / (c.maxPerfiles || 5),
        };
      });

      // Cuentas casi vacías (1 o 2 perfiles ocupados)
      const bajaOcupacion = calculadas.filter((c) => c.ocupados > 0 && c.ocupados <= 2);
      // Cuentas receptoras con espacio disponible
      const receptoras = calculadas.filter((c) => c.disponibles.length > 0 && c.ocupados > 2);

      for (const origen of bajaOcupacion) {
        for (const acc of origen.root.accounts) {
          const sub = acc.subscriptions[0];
          if (!sub) continue;

          // Buscar una cuenta receptora con espacio
          const destino = receptoras.find((r) => r.disponibles.length > 0 && r.root.id !== origen.root.id);
          if (destino) {
            const perfilLibre = destino.disponibles.shift()!;
            migracionesPropuestas.push({
              clienteId: sub.customerId,
              clienteNombre: sub.customer.user.nombre,
              whatsapp: sub.customer.whatsapp,
              suscripcionId: sub.id,
              servicio: origen.root.service?.nombre || 'Streaming',
              origen: {
                rootId: origen.root.id,
                email: origen.root.email,
                perfil: acc.perfilAsignado,
              },
              destino: {
                rootId: destino.root.id,
                email: destino.root.email,
                nuevoPassword: destino.root.password,
                perfil: perfilLibre.perfilAsignado,
                nuevoAccountId: perfilLibre.id,
              },
            });
            origen.ocupados--;
            if (origen.ocupados === 0) {
              cuentasParaDesactivar.push(origen.root.id);
            }
          }
        }
      }
    }

    // Si se especificó autoMigrate === true, ejecutar la migración física en BD
    if (options?.autoMigrate && migracionesPropuestas.length > 0) {
      for (const mig of migracionesPropuestas) {
        await this.prisma.$transaction(async (tx) => {
          // Asignar nuevo perfil
          await tx.subscription.update({
            where: { id: mig.suscripcionId },
            data: { accountId: mig.destino.nuevoAccountId },
          });

          // Marcar nuevo perfil como OCUPADA
          await tx.account.update({
            where: { id: mig.destino.nuevoAccountId },
            data: { estado: AccountStatus.OCUPADA },
          });

          // Liberar perfil anterior a DISPONIBLE
          await tx.account.update({
            where: { id: mig.origen.rootId }, // profile anterior
            data: { estado: AccountStatus.DISPONIBLE },
          }).catch(() => {});
        });

        // Notificar al cliente con sus nuevas credenciales
        const msg = `Hola ${mig.clienteNombre} 👋,\n\nHemos optimizado tu suscripción a *${mig.servicio}* para garantizarte la máxima velocidad y estabilidad. Tus nuevos datos de acceso son:\n\n📧 Correo: ${mig.destino.email}\n🔑 Contraseña: ${mig.destino.nuevoPassword}\n👤 Perfil: ${mig.destino.perfil || 'Principal'}\n\n¡Gracias por tu preferencia! ✨`;
        if (mig.whatsapp) {
          this.whatsappService.sendTextMessage(mig.whatsapp, msg).catch((e) => {
            this.logger.error(`Error enviando notificación de migración: ${e.message}`);
          });
        }
      }

      // Marcar cuentas vaciadas como NO_RENOVAR
      if (cuentasParaDesactivar.length > 0) {
        await this.prisma.rootAccount.updateMany({
          where: { id: { in: cuentasParaDesactivar } },
          data: { estado: RootAccountStatus.NO_RENOVAR },
        });
      }
    }

    return {
      totalMigraciones: migracionesPropuestas.length,
      migracionesPropuestas,
      cuentasParaDesactivar,
      ejecutado: options?.autoMigrate || false,
    };
  }

  // =========================================================================
  // CREACIÓN, IMPORTACIÓN Y GESTIÓN GENERAL DE PERFILES / ACCOUNTS
  // =========================================================================
  async create(dto: CreateAccountDto) {
    const emailCuenta = dto.emailCuenta.trim();

    // Verificación bloqueante de Lista Negra / Cementerio de Cuentas (SRS SGVS RF-027, RF-035, RF-011)
    const inCemetery = await this.prisma.cemeteryAccount.findUnique({ where: { email: emailCuenta } });
    if (inCemetery) {
      throw new BadRequestException(
        `El correo "${emailCuenta}" se encuentra bloqueado en el Cementerio de Cuentas / Lista Negra. Motivo: ${inCemetery.motivoBaja}`,
      );
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const account = await this.prisma.account.create({ data: dto });

    await this.auditService.registrarEvento({
      accion: 'CREACION_CUENTA',
      modulo: AuditCategory.INVENTARIO,
      severidad: AuditSeverity.INFO,
      descripcion: `Nuevo perfil ingresado al inventario: ${account.emailCuenta} (${account.perfilAsignado || 'N/A'})`,
      entidadTipo: 'Account',
      entidadId: account.id,
    });

    if (account.estado === AccountStatus.DISPONIBLE) {
      this.warrantyService.processPendingWarrantiesForPlan(account.planId).catch((err) => {
        console.error('Error procesando garantías pendientes tras crear cuenta:', err);
      });
    }

    return account;
  }

  async importBatch(dto: ImportAccountsDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    let importados = 0;
    let duplicados = 0;
    let bloqueadosCementerio = 0;
    const errores: string[] = [];
    const batchSize = 50;

    for (let i = 0; i < dto.accounts.length; i += batchSize) {
      const batch = dto.accounts.slice(i, i + batchSize);
      for (const acc of batch) {
        try {
          const email = acc.emailCuenta.trim();
          const inCemetery = await this.prisma.cemeteryAccount.findUnique({ where: { email } });
          if (inCemetery) {
            bloqueadosCementerio++;
            errores.push(`Ignorado por Lista Negra/Cementerio: ${email}`);
            continue;
          }

          await this.prisma.account.create({
            data: {
              planId: dto.planId,
              emailCuenta: email,
              passwordCuenta: acc.passwordCuenta,
              perfilAsignado: acc.perfilAsignado,
              pinPerfil: acc.pinPerfil,
              assignedPin: acc.pinPerfil,
              batchId: dto.batchId,
              estado: AccountStatus.DISPONIBLE,
            },
          });
          importados++;
        } catch (error: any) {
          if (error.code === 'P2002') duplicados++;
          else errores.push(`Error con ${acc.emailCuenta}: ${error.message}`);
        }
      }
    }

    if (dto.batchId) {
      await this.prisma.supplierBatch.update({
        where: { id: dto.batchId },
        data: { cantidadCuentas: { increment: importados } },
      });
    }

    if (importados > 0) {
      this.warrantyService.processPendingWarrantiesForPlan(dto.planId).catch((err) => {
        console.error('Error procesando garantías tras importación:', err);
      });
    }

    return { importados, duplicados, bloqueadosCementerio, errores };
  }

  async findAll(filters: { planId?: string; estado?: AccountStatus; batchId?: string; providerId?: string; search?: string }) {
    return this.prisma.account.findMany({
      where: {
        deletedAt: null,
        ...(filters.planId && { planId: filters.planId }),
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.batchId && { batchId: filters.batchId }),
        ...(filters.providerId && { providerId: filters.providerId }),
        ...(filters.search && {
          OR: [
            { emailCuenta: { contains: filters.search, mode: 'insensitive' } },
            { perfilAsignado: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        plan: { include: { service: true } },
        rootAccount: { include: { provider: true } },
        provider: true,
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, deletedAt: null },
      include: {
        plan: { include: { service: true } },
        rootAccount: { include: { provider: true } },
        provider: true,
        batch: true,
        subscriptions: { where: { estado: SubscriptionStatus.ACTIVA }, include: { customer: { include: { user: true } } } },
      },
    });
    if (!account) throw new NotFoundException('Perfil no encontrado');
    return account;
  }

  async update(id: string, dto: any) {
    const account = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!account) throw new NotFoundException('Perfil no encontrado');

    const updated = await this.prisma.account.update({
      where: { id },
      data: dto,
      include: { plan: { select: { nombrePlan: true, service: { select: { nombre: true } } } } },
    });

    if (updated.estado === AccountStatus.DISPONIBLE) {
      this.warrantyService.processPendingWarrantiesForPlan(updated.planId).catch((err) => {
        console.error('Error al procesar garantías:', err);
      });
    }

    return updated;
  }

  async remove(id: string) {
    const account = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!account) throw new NotFoundException('Perfil no encontrado o ya eliminado');

    return this.prisma.account.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        estado: AccountStatus.DEFECTUOSA,
      },
    });
  }

  async getBatches() {
    return this.prisma.supplierBatch.findMany({
      include: { _count: { select: { accounts: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInventorySummary() {
    const porEstado = await this.prisma.account.groupBy({
      by: ['estado'],
      _count: true,
    });

    const porPlan = await this.prisma.account.groupBy({
      by: ['planId', 'estado'],
      _count: true,
    });

    const planes = await this.prisma.plan.findMany({
      include: { service: { select: { nombre: true } } },
    });

    const rootAccountsCount = await this.prisma.rootAccount.count();
    const providersCount = await this.prisma.provider.count();

    return {
      porEstado,
      porPlan,
      planes,
      rootAccountsCount,
      providersCount,
    };
  }

  // =========================================================================
  // GESTIÓN DE CEMENTERIO DE CUENTAS / LISTA NEGRA (SRS SGVS RF-027, RF-035, RF-011)
  // =========================================================================
  async addToCemetery(dto: AddToCemeteryDto, currentUser: any) {
    const email = dto.email.trim();
    const existing = await this.prisma.cemeteryAccount.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(`El correo "${email}" ya se encuentra registrado en el Cementerio de Cuentas.`);
    }

    const cemetery = await this.prisma.$transaction(async (tx) => {
      // 1. Crear registro en cementerio
      const created = await tx.cemeteryAccount.create({
        data: {
          email,
          plataforma: dto.plataforma || null,
          motivoBaja: dto.motivoBaja,
          estadoCuenta: dto.estadoCuenta || 'COMPROMETIDA',
          rootAccountId: dto.rootAccountId || null,
          registradoPor: currentUser?.nombre || currentUser?.email || 'Sistema',
        },
        include: {
          rootAccount: true,
        },
      });

      // 2. Si corresponde a una cuenta raíz, marcarla como CAIDA y sus perfiles como DEFECTUOSA
      if (dto.rootAccountId) {
        await tx.rootAccount.update({
          where: { id: dto.rootAccountId },
          data: { estado: RootAccountStatus.CAIDA },
        });

        await tx.account.updateMany({
          where: { rootAccountId: dto.rootAccountId },
          data: { estado: AccountStatus.DEFECTUOSA },
        });
      } else if (dto.accountId) {
        await tx.account.update({
          where: { id: dto.accountId },
          data: { estado: AccountStatus.DEFECTUOSA },
        });
      }

      return created;
    });

    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      modulo: AuditCategory.INVENTARIO,
      accion: 'ENVIO_CEMENTERIO_CUENTAS',
      severidad: AuditSeverity.WARNING,
      descripcion: `Cuenta [${email}] enviada al Cementerio de Cuentas / Lista Negra. Motivo: ${dto.motivoBaja}`,
      entidadTipo: 'CemeteryAccount',
      entidadId: cemetery.id,
    });

    return {
      message: `Cuenta ${email} enviada exitosamente al Cementerio de Cuentas.`,
      cemetery,
    };
  }

  async getCemeteryAccounts(search?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { motivoBaja: { contains: search, mode: 'insensitive' as const } },
            { plataforma: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      this.prisma.cemeteryAccount.count({ where }),
      this.prisma.cemeteryAccount.findMany({
        where,
        include: {
          rootAccount: { select: { id: true, email: true, service: { select: { nombre: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async removeFromCemetery(id: string, currentUser: any) {
    const item = await this.prisma.cemeteryAccount.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Registro de cementerio no encontrado');

    await this.prisma.cemeteryAccount.delete({ where: { id } });

    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      modulo: AuditCategory.INVENTARIO,
      accion: 'DESBLOQUEO_CEMENTERIO_CUENTAS',
      severidad: AuditSeverity.INFO,
      descripcion: `Cuenta [${item.email}] removida del Cementerio de Cuentas / Lista Negra.`,
      entidadTipo: 'CemeteryAccount',
      entidadId: id,
    });

    return {
      message: `Cuenta ${item.email} removida del Cementerio de Cuentas y desbloqueada.`,
    };
  }

  // =========================================================================
  // HISTORIAL DE CAMBIOS DE CLAVE (SRS SGVS RF-010)
  // =========================================================================
  async getPasswordHistory(filters?: { rootAccountId?: string; accountId?: string; limit?: number }) {
    const limit = filters?.limit || 100;
    return this.prisma.passwordChange.findMany({
      where: {
        ...(filters?.rootAccountId && { rootAccountId: filters.rootAccountId }),
        ...(filters?.accountId && { accountId: filters.accountId }),
      },
      include: {
        rootAccount: { select: { id: true, email: true, service: { select: { nombre: true } } } },
        account: { select: { id: true, emailCuenta: true, perfilAsignado: true } },
        asesor: { select: { id: true, nombre: true, email: true, rol: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // =========================================================================
  // RENOVACIÓN DE CUENTAS MATRICES / HISTORIAL (SRS Req. Adicional 10 / Punto 18)
  // =========================================================================
  async renewRootAccount(id: string, dto: RenewRootAccountDto, currentUser: any) {
    const root = await this.prisma.rootAccount.findUnique({
      where: { id },
      include: {
        provider: true,
        service: true,
        accounts: {
          where: { estado: AccountStatus.DISPONIBLE },
        },
      },
    });

    if (!root) throw new NotFoundException('Cuenta matriz no encontrada');

    const now = new Date();
    const fechaBase =
      root.fechaVencimientoRaiz && new Date(root.fechaVencimientoRaiz) > now
        ? new Date(root.fechaVencimientoRaiz)
        : now;

    const nuevaFechaVencimiento = new Date(fechaBase.getTime() + dto.diasExtendidos * 24 * 60 * 60 * 1000);
    const costoRenovacion = Number(dto.costoRenovacion);
    const costoAnterior = root.costoCompra ? Number(root.costoCompra) : 0;
    const maxPerfiles = root.maxPerfiles || 5;
    const nuevoCostoPerfil = costoRenovacion / maxPerfiles;

    const renewal = await this.prisma.$transaction(async (tx) => {
      // 1. Actualizar cuenta raíz
      await tx.rootAccount.update({
        where: { id },
        data: {
          fechaVencimientoRaiz: nuevaFechaVencimiento,
          costoCompra: costoRenovacion,
          estado: RootAccountStatus.ACTIVA,
        },
      });

      // 2. Actualizar costo promedio por perfil en pantallas disponibles
      await tx.account.updateMany({
        where: {
          rootAccountId: id,
          estado: AccountStatus.DISPONIBLE,
        },
        data: {
          costoCompra: nuevoCostoPerfil,
        },
      });

      // 3. Registrar en historial de renovaciones
      return tx.rootAccountRenewal.create({
        data: {
          rootAccountId: id,
          providerId: root.providerId,
          fechaRenovacion: now,
          diasExtendidos: dto.diasExtendidos,
          fechaVencimientoPrevia: root.fechaVencimientoRaiz,
          nuevaFechaVencimiento,
          costoRenovacion,
          costoAnterior,
          usuarioId: currentUser?.id || currentUser?.userId || null,
          usuarioNombre: currentUser?.nombre || 'Sistema',
          notas: dto.notas || null,
        },
        include: {
          rootAccount: { select: { id: true, email: true, service: { select: { nombre: true } } } },
          provider: { select: { id: true, nombre: true } },
        },
      });
    });

    await this.auditService.registrarEvento({
      usuarioId: currentUser?.id || currentUser?.userId,
      usuarioNombre: currentUser?.nombre,
      modulo: AuditCategory.INVENTARIO,
      accion: 'RENOVACION_CUENTA_RAIZ',
      severidad: AuditSeverity.SUCCESS,
      descripcion: `Cuenta matriz [${root.email}] renovada por ${dto.diasExtendidos} días. Nuevo vencimiento: ${nuevaFechaVencimiento.toLocaleDateString('es-CO')} | Costo: $${costoRenovacion.toLocaleString('es-CO')}`,
      entidadTipo: 'RootAccount',
      entidadId: root.id,
      detalles: {
        rootAccountId: root.id,
        diasExtendidos: dto.diasExtendidos,
        nuevaFechaVencimiento,
        costoRenovacion,
      },
    });

    return {
      message: `Cuenta matriz ${root.email} renovada exitosamente por ${dto.diasExtendidos} días.`,
      renewal,
    };
  }

  async getRootAccountRenewals(rootAccountId: string) {
    return this.prisma.rootAccountRenewal.findMany({
      where: { rootAccountId },
      include: {
        provider: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaRenovacion: 'desc' },
    });
  }

  // =========================================================================
  // CONTROL DE FACTURACIÓN CON PROVEEDORES (SRS RF-031 / Punto 22)
  // =========================================================================
  async getBillingAlerts(diasAnticipacion = 5) {
    const ahora = new Date();
    const diaActual = ahora.getDate();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const rootAccounts = await this.prisma.rootAccount.findMany({
      where: {
        estado: { notIn: [RootAccountStatus.CAIDA, RootAccountStatus.NO_RENOVAR] },
      },
      include: {
        service: true,
        provider: true,
        _count: {
          select: {
            accounts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const alertas: any[] = [];

    for (const root of rootAccounts) {
      let proximaFechaPago: Date | null = null;
      let diasRestantes: number | null = null;

      if (root.diaFacturacion) {
        // Cálculo basado en el día fijo del mes (1 a 31)
        const diaPago = Math.min(root.diaFacturacion, 28); // seguro para meses cortos
        let fechaTarget = new Date(anioActual, mesActual, diaPago);
        if (diaPago < diaActual) {
          fechaTarget = new Date(anioActual, mesActual + 1, diaPago);
        }
        proximaFechaPago = fechaTarget;
        diasRestantes = Math.ceil((fechaTarget.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
      } else if (root.fechaVencimientoRaiz) {
        // Fallback a fecha de vencimiento matriz
        proximaFechaPago = new Date(root.fechaVencimientoRaiz);
        diasRestantes = Math.ceil((proximaFechaPago.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (diasRestantes !== null) {
        const limiteAlerta = root.alertaFacturacionDias || diasAnticipacion;
        if (diasRestantes <= limiteAlerta) {
          const urgencia =
            diasRestantes <= 1
              ? 'CRITICA'
              : diasRestantes <= 3
              ? 'ALTA'
              : 'MEDIA';

          alertas.push({
            rootAccountId: root.id,
            email: root.email,
            servicio: root.service?.nombre || 'Streaming',
            proveedor: root.provider?.nombre || 'Proveedor Directo',
            proveedorTelefono: root.provider?.telefono || null,
            diaFacturacion: root.diaFacturacion || proximaFechaPago?.getDate(),
            proximaFechaPago,
            diasRestantes,
            costoCompra: Number(root.costoCompra || 0),
            metodoPagoProveedor: root.metodoPagoProveedor || 'Transferencia',
            totalPerfiles: root.maxPerfiles,
            urgencia,
          });
        }
      }
    }

    // Ordenar alertas por días restantes ascendente (las más urgentes primero)
    alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);

    return {
      totalAlertas: alertas.length,
      diasAnticipacion,
      alertas,
    };
  }
}