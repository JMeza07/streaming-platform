import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit.dto';
import { AuditCategory, AuditSeverity, Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

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
          detalles: data.detalles ? (data.detalles as Prisma.InputJsonValue) : Prisma.JsonNull,
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
