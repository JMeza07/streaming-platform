import { Controller, Get, Post, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { RequestWarrantyDto } from './dto/request-warranty.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';

@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENTE) // Solo clientes pueden acceder
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  // RESUMEN DEL CLIENTE
  @Get('summary')
  getSummary(@CurrentUser() user: any) {
    return this.portalService.getCustomerSummary(user.customerId);
  }

  // MIS SUSCRIPCIONES
  @Get('subscriptions')
  getMySubscriptions(@CurrentUser() user: any) {
    return this.portalService.getMySubscriptions(user.customerId);
  }

  // DETALLE DE UNA SUSCRIPCIÓN (Con credenciales)
  @Get('subscriptions/:id')
  getSubscriptionDetails(
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    return this.portalService.getSubscriptionDetails(user.customerId, id);
  }

  // HISTORIAL DE COMPRAS
  @Get('orders')
  getMyOrders(@CurrentUser() user: any) {
    return this.portalService.getMyOrders(user.customerId);
  }

  // DETALLE DE UNA ORDEN DE COMPRA
  @Get('orders/:id')
  getOrderDetails(
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    return this.portalService.getOrderDetails(user.customerId, id);
  }

  // SOLICITAR GARANTÍA
  @Post('warranty')
  requestWarranty(
    @CurrentUser() user: any,
    @Body() dto: RequestWarrantyDto
  ) {
    return this.portalService.requestWarranty(user.customerId, dto);
  }

  // MIS TICKETS DE GARANTÍA
  @Get('tickets')
  getMyTickets(@CurrentUser() user: any) {
    return this.portalService.getMyTickets(user.customerId);
  }

  // RENOVACIÓN RÁPIDA
  @Post('renew')
  renewSubscription(
    @CurrentUser() user: any,
    @Body() dto: RenewSubscriptionDto
  ) {
    return this.portalService.renewSubscription(user.customerId, dto);
  }

  // ACTUALIZAR PERFIL
  @Patch('profile')
  updateProfile(
    @CurrentUser() user: any,
    @Body() data: { nombre?: string; whatsapp?: string; pais?: string }
  ) {
    return this.portalService.updateProfile(user.customerId, data);
  }
}