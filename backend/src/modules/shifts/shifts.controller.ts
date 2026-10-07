import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateShiftMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ShiftStatus } from '@prisma/client';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  // =========================================================================
  // TURNO ACTUAL
  // =========================================================================
  @Get('current')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL)
  getCurrentShift(@Request() req: any) {
    const userId = req.user.userId || req.user.id;
    return this.shiftsService.getCurrentShift(userId, req.user.rol);
  }

  // =========================================================================
  // ABRIR TURNO (SRS RF-022)
  // =========================================================================
  @Post('open')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL)
  openShift(@Body() dto: OpenShiftDto, @Request() req: any) {
    const userId = req.user.userId || req.user.id;
    const userName = req.user.nombre || req.user.email || 'Asesor';
    return this.shiftsService.openShift(userId, userName, dto);
  }

  // =========================================================================
  // REGISTRAR MOVIMIENTO DE CAJA
  // =========================================================================
  @Post(':id/movements')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL)
  createMovement(
    @Param('id') id: string,
    @Body() dto: CreateShiftMovementDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    const userName = req.user.nombre || req.user.email || 'Asesor';
    return this.shiftsService.createMovement(id, userId, userName, dto);
  }

  // =========================================================================
  // CERRAR TURNO Y REALIZAR ARQUEO (SRS RF-022)
  // =========================================================================
  @Post(':id/close')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL)
  closeShift(
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    const userName = req.user.nombre || req.user.email || 'Asesor';
    return this.shiftsService.closeShift(id, userId, userName, dto);
  }

  // =========================================================================
  // HISTORIAL DE REPORTES DE TURNO
  // =========================================================================
  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL)
  getHistory(
    @Query('asesorId') asesorId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('estado') estado?: ShiftStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shiftsService.getShiftHistory({
      asesorId,
      fechaInicio,
      fechaFin,
      estado,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }

  // =========================================================================
  // DETALLE DE UN TURNO ESPECÍFICO
  // =========================================================================
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL)
  getShiftById(@Param('id') id: string) {
    return this.shiftsService.getShiftById(id);
  }
}
