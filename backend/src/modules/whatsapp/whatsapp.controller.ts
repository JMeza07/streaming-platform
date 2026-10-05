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
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ConfigWhatsappDto } from './dto/config-whatsapp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly chatbotService: ChatbotService,
  ) {}

  // ============================================
  // ENDPOINTS PÚBLICOS (Webhooks)
  // ============================================

  // WEBHOOK PARA RECIBIR MENSAJES ENTRANTES DE EVOLUTION API
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    // Procesar mensaje en segundo plano para responder de inmediato 200 a Evolution API
    this.chatbotService.processIncomingMessage(body).catch((err) => {
      console.error('Error en procesamiento de Chatbot:', err);
    });

    return { success: true };
  }

  // COMPROBACIÓN DE SALUD DEL WEBHOOK (GET desde navegador)
  @Get('webhook')
  getWebhookHealth() {
    return {
      status: 'active',
      message: 'El Webhook de WhatsApp está activo y listo para recibir peticiones POST desde Evolution API.',
      endpoint: '/api/whatsapp/webhook',
      timestamp: new Date().toISOString(),
    };
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
    return { message: 'Usa el endpoint de configuración para activar notificaciones' };
  }

  // ESTADO DEL MOTOR DE IA LOCAL (OLLAMA)
  @Get('chatbot/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SOPORTE)
  async getChatbotStatus() {
    return this.chatbotService.checkOllamaStatus();
  }

  // OBTENER CONFIGURACIÓN DEL CHATBOT IA Y REGLAS
  @Get('chatbot/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getChatbotConfig() {
    return this.whatsappService.getChatbotConfig();
  }

  // ACTUALIZAR CONFIGURACIÓN DEL CHATBOT IA Y REGLAS
  @Patch('chatbot/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateChatbotConfig(@Body() body: any) {
    return this.whatsappService.updateChatbotConfig(body);
  }

  // SIMULADOR / SANDBOX DE PRUEBA EN VIVO DE LA IA
  @Post('chatbot/simulate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async simulateAiChat(@Body() body: { mensaje: string; config?: any }) {
    return this.chatbotService.simulateAiChat(body.mensaje, body.config);
  }

  // DESCARGAR UN MODELO EN OLLAMA DIRECTAMENTE DESDE LA INTERFAZ
  @Post('chatbot/pull-model')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async pullOllamaModel(@Body('model') model: string) {
    return this.chatbotService.pullModel(model);
  }

  // CONFIGURAR WEBHOOK EN EVOLUTION API
  @Post('webhook/configure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async configureWebhook(@Body('url') url?: string) {
    return this.whatsappService.configureWebhook(url);
  }
}