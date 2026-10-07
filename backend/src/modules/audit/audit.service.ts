import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit.dto';
import { AuditCategory, AuditSeverity, Prisma } from '@prisma/client';

/** Claves cuyo valor nunca debe quedar en el log de auditoría. */
const REDACTED_KEYS = /^(password|passwordHash|passwordCuenta|pinPerfil|assignedPin|imapPassword|twoFactorSecret|token|refreshToken|tokenHash)$/i;

@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * SRS RNF-S08: los logs de auditoría no pueden modificarse ni eliminarse por ningún usuario,
   * incluido el administrador. Se garantiza a nivel de base de datos con un trigger idempotente.
   */
  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION audit_logs_inmutable() RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'audit_logs es inmutable: operación % no permitida', TG_OP;
        END;
        $$ LANGUAGE plpgsql;
      `);
      await this.prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_audit_logs_no_update_delete ON audit_logs;`);
      await this.prisma.$executeRawUnsafe(`
        CREATE TRIGGER trg_audit_logs_no_update_delete
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION audit_logs_inmutable();
      `);
      await this.prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_audit_logs_no_truncate ON audit_logs;`);
      await this.prisma.$executeRawUnsafe(`
        CREATE TRIGGER trg_audit_logs_no_truncate
        BEFORE TRUNCATE ON audit_logs
        FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_inmutable();
      `);
      this.logger.log('🛡️  Protección de inmutabilidad de audit_logs activa');
    } catch (err: any) {
      this.logger.error(`No se pudo instalar la protección de audit_logs: ${err.message}`);
    }
  }

  /** Enmascara recursivamente datos sensibles antes de persistirlos. */
  private sanitize(value: any, depth = 0): any {
    if (value === null || value === undefined || depth > 6) return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((v) => this.sanitize(v, depth + 1));
    if (typeof value === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = REDACTED_KEYS.test(k) ? (v ? '***' : v) : this.sanitize(v, depth + 1);
      }
      return out;
    }
    if (typeof value === 'bigint') return value.toString();
    return value;
  }

  private toJson(value: any) {
    return value ? (this.sanitize(value) as Prisma.InputJsonValue) : Prisma.JsonNull;
  }

  /**
   * Registra un evento de auditoría de forma segura y asíncrona.
   * Nunca arroja excepción hacia el llamador para proteger el flujo del negocio.
   */
  async registrarEvento(data: CreateAuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          accion: data.accion,
          modulo: data.modulo || AuditCategory.SISTEMA,
          severidad: data.severidad || AuditSeverity.INFO,
          descripcion: data.descripcion,
          detalles: this.toJson(data.detalles),
          valoresAnteriores: this.toJson(data.valoresAnteriores),
          valoresNuevos: this.toJson(data.valoresNuevos),
          ip: data.ip || null,
          userAgent: data.userAgent || null,
          entidadTipo: data.entidadTipo || data.entidad || null,
          entidadId: data.entidadId || null,
          exito: data.exito !== undefined ? data.exito : true,
          errorMensaje: data.errorMensaje || null,
          usuarioId: data.usuarioId || null,
          usuarioNombre: data.usuarioNombre || null,
          usuarioEmail: data.usuarioEmail || null,
          usuarioRol: data.usuarioRol || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error guardando log de auditoría (${data.accion}): ${err.message}`, err.stack);
      return null;
    }
  }

  /**
   * Consulta paginada y filtrada de logs de auditoría.
   */
  async findAll(params: {
    search?: string;
    modulo?: string;
    severidad?: string;
    usuarioId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    exito?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    // Filtro por módulo
    if (params.modulo && Object.values(AuditCategory).includes(params.modulo as AuditCategory)) {
      where.modulo = params.modulo as AuditCategory;
    }

    // Filtro por severidad
    if (params.severidad && Object.values(AuditSeverity).includes(params.severidad as AuditSeverity)) {
      where.severidad = params.severidad as AuditSeverity;
    }

    // Filtro por usuario
    if (params.usuarioId) {
      where.usuarioId = params.usuarioId;
    }

    // Filtro por éxito/fallo
    if (params.exito !== undefined && params.exito !== '') {
      where.exito = params.exito === 'true' || params.exito === '1';
    }

    // Filtro por fechas
    if (params.fechaDesde || params.fechaHasta) {
      where.createdAt = {};
      if (params.fechaDesde) {
        const [y, m, d] = params.fechaDesde.split('-').map(Number);
        where.createdAt.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }
      if (params.fechaHasta) {
        const [y, m, d] = params.fechaHasta.split('-').map(Number);
        where.createdAt.lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      }
    }

    // Búsqueda libre (descripción, acción, usuario, entidad, IP)
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { descripcion: { contains: q, mode: 'insensitive' } },
        { accion: { contains: q, mode: 'insensitive' } },
        { usuarioNombre: { contains: q, mode: 'insensitive' } },
        { usuarioEmail: { contains: q, mode: 'insensitive' } },
        { entidadId: { contains: q, mode: 'insensitive' } },
        { entidadTipo: { contains: q, mode: 'insensitive' } },
        { ip: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Métricas y estadísticas completas de auditoría para el panel del administrador.
   */
  async getStats() {
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    const [
      totalEvents,
      todayEvents,
      criticalCount,
      warningCount,
      failedCount,
      moduleCounts,
      severityCounts,
      recentAlerts,
    ] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: hoyInicio } } }),
      this.prisma.auditLog.count({
        where: { severidad: { in: [AuditSeverity.CRITICAL, AuditSeverity.ERROR] } },
      }),
      this.prisma.auditLog.count({ where: { severidad: AuditSeverity.WARNING } }),
      this.prisma.auditLog.count({ where: { exito: false } }),
      this.prisma.auditLog.groupBy({
        by: ['modulo'],
        _count: { id: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['severidad'],
        _count: { id: true },
      }),
      this.prisma.auditLog.findMany({
        where: { severidad: { in: [AuditSeverity.WARNING, AuditSeverity.ERROR, AuditSeverity.CRITICAL] } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    // Top operadores activos
    const topOperatorsRaw = await this.prisma.auditLog.groupBy({
      by: ['usuarioNombre', 'usuarioEmail', 'usuarioRol'],
      where: { usuarioNombre: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topOperators = topOperatorsRaw.map((o) => ({
      nombre: o.usuarioNombre || 'Usuario',
      email: o.usuarioEmail || '',
      rol: o.usuarioRol || 'USUARIO',
      count: o._count.id,
    }));

    return {
      totalEvents,
      todayEvents,
      criticalCount,
      warningCount,
      failedCount,
      moduleCounts: moduleCounts.map((m) => ({ modulo: m.modulo, total: m._count.id })),
      severityCounts: severityCounts.map((s) => ({ severidad: s.severidad, total: s._count.id })),
      recentAlerts,
      topOperators,
    };
  }

  /**
   * Exporta hasta 2000 logs para reportes o cumplimiento regulatorio.
   */
  async exportLogs(params: {
    search?: string;
    modulo?: string;
    severidad?: string;
    usuarioId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.modulo && Object.values(AuditCategory).includes(params.modulo as AuditCategory)) {
      where.modulo = params.modulo as AuditCategory;
    }
    if (params.severidad && Object.values(AuditSeverity).includes(params.severidad as AuditSeverity)) {
      where.severidad = params.severidad as AuditSeverity;
    }
    if (params.usuarioId) {
      where.usuarioId = params.usuarioId;
    }
    if (params.fechaDesde || params.fechaHasta) {
      where.createdAt = {};
      if (params.fechaDesde) {
        const [y, m, d] = params.fechaDesde.split('-').map(Number);
        where.createdAt.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }
      if (params.fechaHasta) {
        const [y, m, d] = params.fechaHasta.split('-').map(Number);
        where.createdAt.lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      }
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { descripcion: { contains: q, mode: 'insensitive' } },
        { accion: { contains: q, mode: 'insensitive' } },
        { usuarioNombre: { contains: q, mode: 'insensitive' } },
        { entidadId: { contains: q, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
  }
}
