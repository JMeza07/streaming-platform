import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Resumen y estadísticas de auditoría y seguridad.
   */
  @Get('stats')
  getStats() {
    return this.auditService.getStats();
  }

  /**
   * Exporta logs para descarga o backup.
   */
  @Get('export')
  exportLogs(
    @Query('search') search?: string,
    @Query('modulo') modulo?: string,
    @Query('severidad') severidad?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.auditService.exportLogs({
      search,
      modulo,
      severidad,
      usuarioId,
      fechaDesde,
      fechaHasta,
    });
  }

  /**
   * Lista logs paginados y filtrados.
   */
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('modulo') modulo?: string,
    @Query('severidad') severidad?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('exito') exito?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      search,
      modulo,
      severidad,
      usuarioId,
      fechaDesde,
      fechaHasta,
      exito,
      page,
      limit,
    });
  }
}
