import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { toDataURL } from 'qrcode';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private async getIssuer(): Promise<string> {
    try {
      const setting = await this.prisma.systemSetting.findFirst();
      if (setting?.nombrePlataforma && setting.nombrePlataforma.trim().length > 0) {
        return setting.nombrePlataforma.trim();
      }
    } catch {}
    return 'MezaStreaming';
  }

  /**
   * Generates a new TOTP secret and a Base64 QR code image for Google Authenticator
   */
  async generateSecret(email: string): Promise<{ secret: string; otpauthUrl: string; qrCode: string }> {
    const issuer = await this.getIssuer();
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer,
      label: email,
      secret,
    });
    const qrCode = await toDataURL(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCode,
    };
  }

  /**
   * Validates a 6-digit TOTP code against the secret (allowing 30s window drift)
   */
  verifyCode(code: string, secret: string): boolean {
    if (!code || !secret) return false;
    const cleanCode = code.replace(/\D/g, '').trim();
    if (cleanCode.length !== 6) return false;

    try {
      const result = verifySync({
        token: cleanCode,
        secret,
      }) as any;
      return Boolean(result?.valid);
    } catch (err: any) {
      this.logger.error(`Error verifying TOTP code: ${err.message}`);
      return false;
    }
  }

  /**
   * Creates a signed 5-minute temporary token during login while waiting for 2FA verification
   */
  generateTempToken(user: { id: string; email: string; rol: UserRole }): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        rol: user.rol,
        is2FAPending: true,
      },
      { expiresIn: '5m' },
    );
  }

  /**
   * Validates and extracts payload from a temporary 2FA token
   */
  validateTempToken(tempToken: string): { sub: string; email: string; rol: UserRole } {
    try {
      const payload = this.jwtService.verify(tempToken);
      if (!payload.is2FAPending || !payload.sub) {
        throw new UnauthorizedException('Token de verificación 2FA no válido');
      }
      return {
        sub: payload.sub,
        email: payload.email,
        rol: payload.rol,
      };
    } catch (error) {
      throw new UnauthorizedException('La sesión de verificación 2FA ha expirado o es inválida');
    }
  }

  /**
   * Determines whether 2FA is mandatory for a given role
   * Mandatory for: ADMIN, VENDEDOR, SOPORTE, ASESOR_COMERCIAL (System users)
   * Optional for: CLIENTE
   */
  is2FAMandatory(role: UserRole): boolean {
    return role !== UserRole.CLIENTE;
  }
}
