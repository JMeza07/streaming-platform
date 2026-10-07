import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, SubscriptionStatus } from '@prisma/client';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // =========================================================================
  // ALERTAS DE VENCIMIENTO Y RENOVACIÓN (SRS RF-025 / RF-026 / Punto 8)
  // =========================================================================
  @Get('expiration-alerts')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  getExpirationAlerts(
    @Query('dias') dias?: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.subscriptionsService.getExpirationAlerts({
      dias: dias ? parseInt(dias, 10) : 7,
      serviceId,
    });
  }

  @Post(':id/mark-notified')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  markNotified(@Param('id') id: string, @Request() req: any) {
    return this.subscriptionsService.markNotified(id, req.user);
  }

  @Post(':id/send-reminder')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  sendReminder(@Param('id') id: string, @Request() req: any) {
    return this.subscriptionsService.sendExpirationReminder(id, req.user);
  }

  // LISTAR TODAS LAS CUENTAS VENDIDAS (Solo Admin)
  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('serviceId') serviceId?: string,
    @Query('vendedorId') vendedorId?: string,
    @Query('estado') estado?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('canal') canal?: 'todos' | 'online' | 'vendedor',
    @Query('search') search?: string,
  ) {
    return this.subscriptionsService.findAll({
      serviceId,
      vendedorId,
      estado,
      fechaDesde,
      fechaHasta,
      canal,
      search,
    });
  }

  // RENOVAR SUSCRIPCIÓN DIRECTAMENTE (Admin, Vendedor, Soporte, Asesor)
  @Post(':id/renew')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL)
  renewSubscription(
    @Param('id') id: string,
    @Body() dto: { dias?: number; metodoPago?: string; notas?: string; precio?: number; comprobanteUrl?: string },
    @Request() req: any,
  ) {
    return this.subscriptionsService.renewSubscriptionDirectly(id, dto, req.user);
  }

  // SUSPENDER O REACTIVAR SUSCRIPCIÓN / CUENTA VENDIDA (Solo Admin)
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('estado') estado: SubscriptionStatus,
  ) {
    return this.subscriptionsService.updateStatus(id, estado);
  }

  // ACTUALIZAR CREDENCIALES DE LA CUENTA VENDIDA (Solo Admin)
  @Patch(':id/credentials')
  @Roles(UserRole.ADMIN)
  updateCredentials(
    @Param('id') id: string,
    @Body()
    dto: {
      emailCuenta?: string;
      passwordCuenta?: string;
      perfilAsignado?: string;
      pinPerfil?: string;
    },
  ) {
    return this.subscriptionsService.updateCredentials(id, dto);
  }
}
