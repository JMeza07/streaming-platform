import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ImportAccountsDto } from './dto/import-accounts.dto';
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
    fechaVencimientoRaiz?: string | Date;
    costoCompra?: number;
    maxPerfiles?: number;
    imapHost?: string;
    imapPort?: number;
    imapUser?: string;
    imapPassword?: string;
    imapSecure?: boolean;
  }) {
    const existing = await this.prisma.rootAccount.findUnique({ where: { email: data.email.trim() } });
    if (existing) throw new ConflictException('Esta cuenta raíz ya existe');

    const rootAccount = await this.prisma.rootAccount.create({
      data: {
        email: data.email.trim(),
        password: data.password,
        serviceId: data.serviceId,
        providerId: data.providerId,
        fechaVencimientoRaiz: data.fechaVencimientoRaiz ? new Date(data.fechaVencimientoRaiz) : null,
        costoCompra: data.costoCompra !== undefined ? data.costoCompra : 0,
        maxPerfiles: data.maxPerfiles || 5,
        imapHost: data.imapHost,
        imapPort: data.imapPort || 993,
        imapUser: data.imapUser,
        imapPassword: data.imapPassword,
        imapSecure: data.imapSecure !== false,
        estado: RootAccountStatus.ACTIVA,
      },
      include: { service: true, provider: true },
    });

    await this.auditService.registrarEvento({
      modulo: AuditCategory.INVENTARIO,
      accion: 'CREACION_CUENTA_RAIZ',
      severidad: AuditSeverity.INFO,
      descripcion: `Nueva cuenta raíz registrada: ${rootAccount.email}`,
      entidadTipo: 'RootAccount',
      entidadId: rootAccount.id,
    });

    return rootAccount;
  }

  async getRootAccounts(filters?: { serviceId?: string; providerId?: string; estado?: RootAccountStatus }) {
    return this.prisma.rootAccount.findMany({
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
              select: { id: true, customer: { select: { user: { select: { nombre: true, email: true } } } } },
            },
          },
        },
        _count: { select: { accounts: true, incidents: true, infractions: true } },
      },
      orderBy: { createdAt: 'desc' },
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

    // 1. Actualizar contraseña en BD y en los perfiles asociados
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
    });

    // 2. Notificar proactivamente a clientes legítimos (excluyendo infractor si aplica)
    const notificados: string[] = [];

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
    const errores: string[] = [];
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

    return { importados, duplicados, errores };
  }

  async findAll(filters: { planId?: string; estado?: AccountStatus; batchId?: string; providerId?: string; search?: string }) {
    return this.prisma.account.findMany({
      where: {
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
    const account = await this.prisma.account.findUnique({
      where: { id },
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
    const account = await this.prisma.account.findUnique({ where: { id } });
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
    return this.prisma.account.delete({ where: { id } });
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
}