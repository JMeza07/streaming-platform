import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
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
