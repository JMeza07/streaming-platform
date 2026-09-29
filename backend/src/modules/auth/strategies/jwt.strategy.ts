import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

import { UserRole } from '@prisma/client';
import { ALL_SYSTEM_MODULES } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // Si el token es válido, Passport inyecta esto en la petición (req.user)
  async validate(payload: any) {
    if (payload.is2FAPending) {
      throw new UnauthorizedException('Verificación 2FA pendiente. Debe validar el código de autenticación.');
    }

    const [user, customer, affiliate] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, nombre: true, email: true, rol: true, modulosPermitidos: true, activo: true },
      }),
      this.prisma.customer.findUnique({ where: { userId: payload.sub }, select: { id: true } }),
      this.prisma.affiliate.findUnique({ where: { userId: payload.sub }, select: { id: true } }),
    ]);

    const isInternal = user?.rol && user.rol !== UserRole.CLIENTE;
    const finalModules =
      isInternal && (!user?.modulosPermitidos || user.modulosPermitidos.length === 0)
        ? (user?.rol === UserRole.ASESOR_COMERCIAL ? ['/admin/seller', '/admin/customers', '/admin/orders'] : ALL_SYSTEM_MODULES)
        : (user?.modulosPermitidos || []);

    return { 
      userId: payload.sub, 
      id: payload.sub,
      email: payload.email, 
      rol: user?.rol || payload.rol,
      nombre: user?.nombre,
      modulosPermitidos: finalModules,
      customerId: customer?.id || null,
      affiliateId: affiliate?.id || null,
    };
  }
}