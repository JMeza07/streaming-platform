import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SOPORTE)
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  getAll() {
    return this.providersService.getAll();
  }

  // SRS REQ. ADICIONAL 9 (PUNTO 26): Autocompletado de proveedores
  @Get('autocomplete')
  getAutocomplete() {
    return this.providersService.getAutocomplete();
  }

  // SRS RF-024 (PUNTO 17): Mejores tarifas por servicio
  @Get('prices/best-rates')
  getBestRates() {
    return this.providersService.getBestRatesByService();
  }

  // SRS RF-024 (PUNTO 17): Lista de precios de proveedores
  @Get('prices')
  getPrices(
    @Request() req: any,
  ) {
    const providerId = req.query?.providerId;
    const serviceId = req.query?.serviceId;
    return this.providersService.getPrices(providerId, serviceId);
  }

  // SRS RF-024 (PUNTO 17): Guardar precio de proveedor
  @Post('prices')
  @Roles(UserRole.ADMIN)
  savePrice(
    @Body() body: {
      providerId: string;
      serviceId?: string;
      planId?: string;
      precio: number;
      duracionDias?: number;
      moneda?: string;
      notas?: string;
    },
  ) {
    return this.providersService.savePrice(body);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.providersService.getById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() body: CreateProviderDto) {
    return this.providersService.create(body);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() body: UpdateProviderDto,
  ) {
    return this.providersService.update(id, body);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  patch(
    @Param('id') id: string,
    @Body() body: UpdateProviderDto,
  ) {
    return this.providersService.update(id, body);
  }

  @Post(':id/batches')
  @Roles(UserRole.ADMIN)
  createBatch(
    @Param('id') id: string,
    @Body() body: {
      costoTotalLote: number;
      cantidadCuentas: number;
      fechaCompra?: string;
      cuentas?: Array<{
        planId: string;
        emailCuenta: string;
        passwordCuenta: string;
        perfilAsignado?: string;
        pinPerfil?: string;
        costoCompra?: number;
      }>;
    },
  ) {
    return this.providersService.createBatch(id, body);
  }

  // =========================================================================
  // ESCENARIO 9: MARCAR PROVEEDOR COMO CAÍDO (CASCADE UPDATE)
  // =========================================================================
  @Post(':id/mark-down')
  @Roles(UserRole.ADMIN)
  markDown(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    return this.providersService.markProviderAsDown(id, body?.reason || 'Falla mayor de proveedor B2B', req.user);
  }

  // REACTIVAR PROVEEDOR
  @Post(':id/reactivate')
  @Roles(UserRole.ADMIN)
  reactivate(@Param('id') id: string, @Request() req: any) {
    return this.providersService.reactivateProvider(id, req.user);
  }
}
