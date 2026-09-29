import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ConfigWhatsappDto } from './dto/config-whatsapp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  // ============================================
  // ENDPOINTS PÚBLICOS (Webhooks)
  // ============================================

  // WEBHOOK PARA RECIBIR MENSAJES ENTRANTES
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    // Aquí procesarías los mensajes que envían los clientes
    // Por ejemplo: "YA PAGUÉ", "NO FUNCIONA", etc.
    console.log('Webhook recibido:', body);
    
    // TODO: Implementar lógica de chatbot
    return { success: true };
  }

  // ============================================
  // ENDPOINTS PROTEGIDOS (Admin)
  // ============================================

  // CREAR INSTANCIA DE WHATSAPP
  @Post('instance/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createInstance() {
    return this.whatsappService.createInstance();
  }

  // OBTENER QR PARA CONECTAR
  @Get('instance/qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getQrCode() {
    return this.whatsappService.getQrCode();
  }

  // VERIFICAR ESTADO DE CONEXIÓN
  @Get('instance/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getConnectionState() {
    return this.whatsappService.getConnectionState();
  }

  // DESCONECTAR INSTANCIA
  @Post('instance/logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  logout() {
    return this.whatsappService.logout();
  }

  // ENVIAR MENSAJE MANUAL
  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  sendMessage(@Body() dto: SendMessageDto) {
    return this.whatsappService.sendTextMessage(dto.numero, dto.mensaje);
  }

  // OBTENER CONFIGURACIÓN
  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getConfig() {
    return this.whatsappService.getConfig();
  }

  // ACTUALIZAR CONFIGURACIÓN
  @Patch('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateConfig(@Body() dto: ConfigWhatsappDto) {
    return this.whatsappService.updateConfig(dto);
  }

  // ACTIVAR/DESACTIVAR NOTIFICACIONES
  @Post('toggle-notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  toggleNotifications(@Body('activar') activar: boolean) {
    return this.whatsappService.toggleNotifications(activar);
  }

  // EJECUTAR RECORDATORIOS MANUALMENTE (Para pruebas)
  @Post('test-reminders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async testReminders() {
    // Este método es privado en el service, lo exponemos solo para pruebas
    // En producción deberías eliminarlo o protegerlo mejor
    return { message: 'Usa el endpoint de configuración para activar notificaciones' };
  }
}