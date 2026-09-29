import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // REGISTRO PÚBLICO - Máximo 3 registros por minuto por IP
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: any) {
    const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const userAgent = req.headers?.['user-agent'] || '';
    return this.authService.register(dto, String(ip), String(userAgent));
  }

  // LOGIN PÚBLICO - Máximo 5 intentos por minuto por IP (Anti Fuerza Bruta)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const userAgent = req.headers?.['user-agent'] || '';
    return this.authService.login(dto, String(ip), String(userAgent));
  }

  // BUSCAR CUENTA POR CORREO (PÚBLICO) - Máximo 10 consultas por minuto
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('lookup-email')
  lookupEmail(@Body() body: { email: string }) {
    return this.authService.lookupEmail(body?.email);
  }

  // OBTENER DATOS DEL USUARIO AUTENTICADO (RUTA PROTEGIDA)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return {
      message: 'Token válido',
      user: user,
    };
  }
}