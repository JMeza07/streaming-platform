import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // OBTENER CONFIGURACIÓN GLOBAL (Público - para saber si está en mantenimiento)
  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  // ACTUALIZAR CONFIGURACIÓN Y MANTENIMIENTO (Solo Admin)
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateSettings(@Body() dto: any) {
    return this.settingsService.updateSettings(dto);
  }

  // CREAR Y DESCARGAR COPIA DE SEGURIDAD (Solo Admin)
  @Get('backup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createBackup() {
    return this.settingsService.createBackup();
  }

  // RESTAURAR COPIA DE SEGURIDAD (Solo Admin)
  @Post('restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  restoreBackup(@Body() backupData: any) {
    return this.settingsService.restoreBackup(backupData);
  }
}
