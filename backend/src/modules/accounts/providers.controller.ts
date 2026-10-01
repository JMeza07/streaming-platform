import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProvidersService } from './providers.service';
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

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.providersService.getById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() body: { nombre: string; contacto?: string; telefono?: string; email?: string }) {
    return this.providersService.create(body);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() body: { nombre?: string; contacto?: string; telefono?: string; email?: string; estado?: string },
  ) {
    return this.providersService.update(id, body);
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
