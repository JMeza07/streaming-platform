import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch, Delete, Request } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ImportAccountsDto } from './dto/import-accounts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, AccountStatus, RootAccountStatus } from '@prisma/client';

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  // =========================================================================
  // RESUMEN Y REPORTES DE INVENTARIO
  // =========================================================================
  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  getSummary() {
    return this.accountsService.getInventorySummary();
  }

  @Get('batches')
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  getBatches() {
    return this.accountsService.getBatches();
  }

  // ESCENARIO 4: ALERTAS DE DESCALCE DE CICLO (< 3 DÍAS)
  @Get('billing-mismatches')
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  getBillingMismatches() {
    return this.accountsService.checkBillingCycleMismatches();
  }

  // =========================================================================
  // ESCENARIOS 2, 3, 5, 11: GESTIÓN DE CUENTAS RAÍZ (ROOT ACCOUNTS)
  // =========================================================================
  @Get('root-accounts')
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  getRootAccounts(
    @Query('serviceId') serviceId?: string,
    @Query('providerId') providerId?: string,
    @Query('estado') estado?: RootAccountStatus,
  ) {
    return this.accountsService.getRootAccounts({ serviceId, providerId, estado });
  }

  @Post('root-accounts')
  @Roles(UserRole.ADMIN)
  createRootAccount(
    @Body()
    body: {
      email: string;
      password: string;
      serviceId?: string;
      providerId?: string;
      planId?: string;
      tipoVenta?: 'POR_PANTALLA' | 'COMPLETA';
      generateProfiles?: boolean;
      fechaVencimientoRaiz?: string;
      costoCompra?: number;
      maxPerfiles?: number;
      imapHost?: string;
      imapPort?: number;
      imapUser?: string;
      imapPassword?: string;
      imapSecure?: boolean;
    },
  ) {
    return this.accountsService.createRootAccount(body);
  }

  // ESCENARIO 2: MARCAR CUENTA RAÍZ COMO CAÍDA
  @Post('root-accounts/:id/mark-down')
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  markRootAccountDown(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    return this.accountsService.markRootAccountDown(id, body?.reason || 'Cuenta caída o bloqueada', req.user);
  }

  // ESCENARIOS 3 Y 5: ACTUALIZAR CONTRASEÑA RAÍZ CON NOTIFICACIÓN PROACTIVA SELECTIVA
  @Post('root-accounts/:id/change-password')
  @Roles(UserRole.ADMIN)
  changeRootAccountPassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string; excludeOffenderCustomerId?: string },
    @Request() req: any,
  ) {
    return this.accountsService.updateRootAccountPassword(
      id,
      body.newPassword,
      req.user,
      body.excludeOffenderCustomerId,
    );
  }

  // ESCENARIO 11: CONFIRMAR ROTACIÓN DE CREDENCIALES POST-VENCIMIENTO
  @Post('root-accounts/:id/confirm-rotation')
  @Roles(UserRole.ADMIN)
  confirmRotation(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
    @Request() req: any,
  ) {
    return this.accountsService.confirmPasswordRotation(id, body.newPassword, req.user);
  }

  // ESCENARIO 12: CONVERSIÓN DINÁMICA DE INVENTARIO (POR PANTALLAS <-> COMPLETA)
  @Post('root-accounts/:id/convert-inventory')
  @Roles(UserRole.ADMIN)
  convertInventory(
    @Param('id') id: string,
    @Body() body: { targetType: 'POR_PANTALLA' | 'COMPLETA'; targetPlanId: string },
    @Request() req: any,
  ) {
    return this.accountsService.convertInventoryType(id, body.targetType, body.targetPlanId, req.user);
  }

  // ESCENARIO 10: OPTIMIZACIÓN DE INVENTARIO / BIN PACKING
  @Post('optimize-inventory')
  @Roles(UserRole.ADMIN)
  optimizeInventory(@Body() body?: { autoMigrate?: boolean }) {
    return this.accountsService.optimizeInventory({ autoMigrate: body?.autoMigrate ?? false });
  }

  // =========================================================================
  // GESTIÓN GENERAL DE PERFILES / PANTALLAS
  // =========================================================================
  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }

  @Post('import')
  @Roles(UserRole.ADMIN)
  importBatch(@Body() dto: ImportAccountsDto) {
    return this.accountsService.importBatch(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  findAll(
    @Query('planId') planId?: string,
    @Query('estado') estado?: AccountStatus,
    @Query('batchId') batchId?: string,
    @Query('providerId') providerId?: string,
    @Query('search') search?: string,
  ) {
    return this.accountsService.findAll({ planId, estado, batchId, providerId, search });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  update(
    @Param('id') id: string,
    @Body()
    dto: {
      planId?: string;
      rootAccountId?: string;
      emailCuenta?: string;
      passwordCuenta?: string;
      perfilAsignado?: string;
      pinPerfil?: string;
      assignedPin?: string;
      estado?: AccountStatus;
    },
  ) {
    return this.accountsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.accountsService.remove(id);
  }
}