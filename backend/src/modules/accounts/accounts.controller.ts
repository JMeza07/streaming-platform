import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch, Delete } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ImportAccountsDto } from './dto/import-accounts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, AccountStatus } from '@prisma/client';

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

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

  @Get('stock/:planId')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  getStockByPlan(@Param('planId') planId: string) {
    return this.accountsService.getStockByPlan(planId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  findAll(
    @Query('planId') planId?: string,
    @Query('estado') estado?: AccountStatus,
    @Query('batchId') batchId?: string,
  ) {
    return this.accountsService.findAll({ planId, estado, batchId });
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
    @Body() dto: {
      planId?: string;
      emailCuenta?: string;
      passwordCuenta?: string;
      perfilAsignado?: string;
      pinPerfil?: string;
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