import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WarrantyService } from './warranty.service';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { BatchQuarantineDto } from './dto/batch-quarantine.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('warranty')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SOPORTE)
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  // ============================================
  // TICKETS
  // ============================================

  // LISTAR TICKETS PENDIENTES (Vista principal)
  @Get('tickets/pending')
  getPendingTickets() {
    return this.warrantyService.getPendingTickets();
  }

  // LISTAR TODOS LOS TICKETS (Con filtros)
  @Get('tickets')
  getAllTickets(
    @Query('estado') estado?: string,
    @Query('customerId') customerId?: string,
    @Query('motivoReporte') motivoReporte?: string,
  ) {
    return this.warrantyService.getAllTickets({ estado, customerId, motivoReporte });
  }

  // ESTADÍSTICAS DE TICKETS
  @Get('tickets/stats')
  getTicketStats() {
    return this.warrantyService.getTicketStats();
  }

  // RESOLVER TICKET (Aprobar o Rechazar)
  @Post('tickets/resolve')
  resolveTicket(
    @CurrentUser() user: any,
    @Body() dto: ResolveTicketDto,
  ) {
    return this.warrantyService.resolveTicket(user.userId, dto);
  }

  // ASIGNAR NUEVA CUENTA (Cola Prioritaria y Auto-Asignación)
  @Post('tickets/:id/assign-account')
  assignAccountToTicket(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.warrantyService.assignAccountToTicket(id, user.userId);
  }

  // ============================================
  // LOTES Y CONTROL DE CALIDAD
  // ============================================

  // LISTAR TODOS LOS LOTES
  @Get('batches')
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  getAllBatches() {
    return this.warrantyService.getAllBatches();
  }

  // PONER LOTE EN CUARENTENA
  @Post('batches/quarantine')
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  quarantineBatch(
    @CurrentUser() user: any,
    @Body() dto: BatchQuarantineDto,
  ) {
    return this.warrantyService.quarantineBatch(dto.batchId, dto.razon, user?.userId);
  }

  // REACTIVAR LOTE
  @Post('batches/:id/reactivate')
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  reactivateBatch(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.warrantyService.reactivateBatch(id, user?.userId);
  }
}