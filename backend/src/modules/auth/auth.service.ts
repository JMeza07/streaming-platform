import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from './two-factor.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  VerifyTwoFactorDto,
  SetupConfirmTwoFactorDto,
  ToggleTwoFactorDto,
} from './dto/two-factor.dto';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UserRole, AuditCategory, AuditSeverity } from '@prisma/client';
import { ALL_SYSTEM_MODULES } from '../users/users.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos (SRS RNF-S05)
const REFRESH_TOKEN_EXPIRATION_DAYS = 30; // 30 días (SRS RNF-S06)

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private twoFactorService: TwoFactorService,
  ) {}

  // REGISTRO DE CLIENTE
  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const rawWhatsapp = dto.whatsapp.trim();
    const cleanDigits = rawWhatsapp.replace(/[\s\-\+\(\)]/g, '');

    // 1. Verificar si el WhatsApp ya existe en clientes activos
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { whatsapp: rawWhatsapp },
          { whatsapp: cleanDigits },
          ...(cleanDigits.length >= 8 ? [{ whatsapp: { contains: cleanDigits.slice(-10) } }] : []),
        ],
      },
    });

    if (existingCustomer) {
      throw new ConflictException('Ya existe un cliente registrado con este número de WhatsApp');
    }

    // 1.1 Verificar si el teléfono o correo ya pertenece a un usuario activo del sistema
    const existingUser = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { phone: rawWhatsapp },
          { phone: cleanDigits },
          ...(cleanDigits.length >= 8 ? [{ phone: { contains: cleanDigits.slice(-10) } }] : []),
          ...(dto.email && dto.email.trim().length > 0
            ? [{ email: { equals: dto.email.trim(), mode: 'insensitive' as const } }]
            : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.rol !== UserRole.CLIENTE) {
        throw new ConflictException(
          'Este contacto pertenece a un usuario del sistema y no puede ser registrado como cliente.',
        );
      }
      throw new ConflictException('Este usuario o número de teléfono ya se encuentra registrado.');
    }

    // 2. Encriptar contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Crear Usuario y su perfil de Cliente en una sola transacción
    const emailToSave = (dto.email && dto.email.trim().length > 0)
      ? dto.email.trim().toLowerCase()
      : null;

    const user = await this.prisma.user.create({
      data: {
        nombre: dto.nombre.trim(),
        email: emailToSave,
        passwordHash: hashedPassword,
        phone: rawWhatsapp,
        rol: UserRole.CLIENTE,
        twoFactorEnabled: false,
        lastActivityAt: new Date(),
        customer: {
          create: {
            whatsapp: rawWhatsapp,
            pais: dto.pais || 'CO',
          },
        },
      },
      include: { customer: true },
    });

    await this.auditService.registrarEvento({
      accion: 'REGISTRO_CLIENTE',
      modulo: AuditCategory.CLIENTES,
      severidad: AuditSeverity.INFO,
      descripcion: `Nuevo cliente registrado: ${user.nombre} (WhatsApp: ${rawWhatsapp})`,
      entidadTipo: 'User',
      entidadId: user.id,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      usuarioEmail: user.email,
      usuarioRol: user.rol,
      ip,
      userAgent,
    });

    // 4. Generar Token JWT y Refresh Token
    return this.generateToken(user, ip, userAgent);
  }

  // LOGIN CON REGLAS DE 2FA, BLOQUEO POR INTENTOS Y REFRESH TOKENS (SRS RNF-S05 / RNF-S06)
  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const rawInput = dto.email ? dto.email.trim() : '';
    const cleanDigits = rawInput.replace(/[\s\-\+\(\)]/g, '');

    // 1. Buscar usuario por email, phone directo en User, o whatsapp en Customer (solo activos y no borrados)
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: { equals: rawInput, mode: 'insensitive' } },
          { phone: rawInput },
          { phone: cleanDigits },
          ...(cleanDigits.length >= 8 ? [{ phone: { contains: cleanDigits.slice(-10) } }] : []),
          { customer: { whatsapp: rawInput, deletedAt: null } },
          { customer: { whatsapp: cleanDigits, deletedAt: null } },
          ...(cleanDigits.length >= 8 ? [{ customer: { whatsapp: { contains: cleanDigits.slice(-10) }, deletedAt: null } }] : []),
        ],
      },
      include: { customer: true, affiliate: true },
    });

    if (!user || !user.activo) {
      await this.auditService.registrarEvento({
        accion: 'FALLO_INICIO_SESION',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.WARNING,
        descripcion: `Intento de acceso fallido para usuario inexistente o inactivo: ${rawInput}`,
        exito: false,
        errorMensaje: 'Usuario no encontrado o suspendido',
        ip,
        userAgent,
        detalles: { input: rawInput },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 1.1 Validar si la cuenta se encuentra temporalmente bloqueada (SRS RNF-S05)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      await this.auditService.registrarEvento({
        accion: 'INTENTO_ACCESO_CUENTA_BLOQUEADA',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.WARNING,
        descripcion: `Intento de acceso a cuenta bloqueada por fuerza bruta: ${user.email || user.phone} (bloqueo vigente por ${remainingMinutes} min)`,
        exito: false,
        errorMensaje: `Cuenta bloqueada hasta ${user.lockedUntil.toISOString()}`,
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        usuarioEmail: user.email,
        usuarioRol: user.rol,
        ip,
        userAgent,
      });
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente por seguridad tras ${MAX_FAILED_ATTEMPTS} intentos fallidos. Intente nuevamente en ${remainingMinutes} minuto(s).`,
      );
    }

    // 2. Validar contraseña
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash || '');
    if (!isPasswordValid) {
      const nextAttempts = (user.failedLoginAttempts || 0) + 1;
      const isLockedNow = nextAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = isLockedNow ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextAttempts,
          lastFailedLoginAt: new Date(),
          lockedUntil,
        },
      });

      await this.auditService.registrarEvento({
        accion: isLockedNow ? 'BLOQUEO_CUENTA_FUERZA_BRUTA' : 'FALLO_INICIO_SESION',
        modulo: AuditCategory.AUTH,
        severidad: isLockedNow ? AuditSeverity.CRITICAL : AuditSeverity.WARNING,
        descripcion: isLockedNow
          ? `Cuenta BLOQUEADA por 15 minutos tras ${nextAttempts} intentos fallidos consecutivos: ${user.email || user.phone}`
          : `Contraseña incorrecta ingresada para: ${user.email || user.phone} (Intento fallido ${nextAttempts}/${MAX_FAILED_ATTEMPTS})`,
        exito: false,
        errorMensaje: isLockedNow ? 'Cuenta bloqueada por 15 minutos' : 'Contraseña no válida',
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        usuarioEmail: user.email,
        usuarioRol: user.rol,
        ip,
        userAgent,
        detalles: { intentosFallidos: nextAttempts, bloqueado: isLockedNow },
      });

      if (isLockedNow) {
        throw new UnauthorizedException(
          `Cuenta bloqueada temporalmente por seguridad tras ${MAX_FAILED_ATTEMPTS} intentos fallidos. Intente de nuevo en 15 minutos.`,
        );
      }

      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2.1 Restablecer contador de intentos al ingresar exitosamente
    if (user.failedLoginAttempts > 0 || user.lockedUntil !== null) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastFailedLoginAt: null,
          lastActivityAt: new Date(),
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastActivityAt: new Date() },
      });
    }

    // 3. Manejo de 2FA
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (dto.twoFactorCode && this.twoFactorService.verifyCode(dto.twoFactorCode, user.twoFactorSecret)) {
        return this.generateToken(user, ip, userAgent);
      }

      const tempToken = this.twoFactorService.generateTempToken({
        id: user.id,
        email: user.email || user.phone || 'usuario@stream.com',
        rol: user.rol,
      });
      return {
        requires2FA: true,
        tempToken,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
      };
    }

    // Login exitoso directo
    await this.auditService.registrarEvento({
      accion: 'INICIO_SESION',
      modulo: AuditCategory.AUTH,
      severidad: AuditSeverity.SUCCESS,
      descripcion: `Inicio de sesión exitoso de ${user.nombre} (${user.rol})`,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      usuarioEmail: user.email,
      usuarioRol: user.rol,
      ip,
      userAgent,
    });

    return this.generateToken(user, ip, userAgent);
  }

  // VALIDAR CÓDIGO 2FA DURANTE LOGIN
  async verifyTwoFactor(dto: VerifyTwoFactorDto, ip?: string, userAgent?: string) {
    const payload = this.twoFactorService.validateTempToken(dto.tempToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { customer: true, affiliate: true },
    });

    if (!user || !user.activo || user.deletedAt !== null || !user.twoFactorSecret) {
      throw new UnauthorizedException('Usuario no válido o 2FA no configurado');
    }

    const isValid = this.twoFactorService.verifyCode(dto.code, user.twoFactorSecret);
    if (!isValid) {
      await this.auditService.registrarEvento({
        accion: 'FALLO_2FA',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.WARNING,
        descripcion: `Código 2FA incorrecto para usuario: ${user.email} (${user.rol})`,
        exito: false,
        errorMensaje: 'Código de autenticación 2FA erróneo',
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        usuarioEmail: user.email,
        usuarioRol: user.rol,
        ip,
        userAgent,
      });
      throw new UnauthorizedException('Código de Google Authenticator incorrecto o expirado');
    }

    await this.auditService.registrarEvento({
      accion: 'INICIO_SESION_2FA',
      modulo: AuditCategory.AUTH,
      severidad: AuditSeverity.SUCCESS,
      descripcion: `Inicio de sesión validado con Google Authenticator: ${user.nombre} (${user.rol})`,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      usuarioEmail: user.email,
      usuarioRol: user.rol,
      ip,
      userAgent,
    });

    return this.generateToken(user, ip, userAgent);
  }

  // CONFIRMAR Y ACTIVAR CONFIGURACIÓN OBLIGATORIA 2FA (PRIMER LOGIN DE STAFF)
  async setupConfirmTwoFactor(dto: SetupConfirmTwoFactorDto, ip?: string, userAgent?: string) {
    const payload = this.twoFactorService.validateTempToken(dto.tempToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { customer: true, affiliate: true },
    });

    if (!user || !user.activo || user.deletedAt !== null) {
      throw new UnauthorizedException('Usuario no válido o suspendido');
    }

    const isValid = this.twoFactorService.verifyCode(dto.code, dto.secret);
    if (!isValid) {
      throw new BadRequestException('El código ingresado no coincide con el autenticador. Verifica que la hora de tu móvil esté sincronizada.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: dto.secret,
        lastActivityAt: new Date(),
      },
      include: { customer: true, affiliate: true },
    });

    await this.auditService.registrarEvento({
      accion: 'ACTIVACION_2FA_OBLIGATORIA',
      modulo: AuditCategory.AUTH,
      severidad: AuditSeverity.SUCCESS,
      descripcion: `Google Authenticator activado obligatoriamente para personal: ${user.nombre} (${user.rol})`,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      usuarioEmail: user.email,
      usuarioRol: user.rol,
      ip,
      userAgent,
    });

    return this.generateToken(updatedUser, ip, userAgent);
  }

  // INICIAR CONFIGURACIÓN DE 2FA VOLUNTARIA (Para clientes desde su panel)
  async generateUserTwoFactorSetup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const setupData = await this.twoFactorService.generateSecret(user.email);
    return {
      secret: setupData.secret,
      qrCode: setupData.qrCode,
      otpauthUrl: setupData.otpauthUrl,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  // ACTIVAR O DESACTIVAR 2FA (CLIENTES VOLUNTARIO / PROHIBIDO DESACTIVAR PARA STAFF)
  async toggleTwoFactor(userId: string, dto: ToggleTwoFactorDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isMandatory = this.twoFactorService.is2FAMandatory(user.rol);

    if (isMandatory && !dto.enable) {
      throw new ForbiddenException('La autenticación en dos pasos (Google Authenticator) es obligatoria e inmutable para usuarios administrativos.');
    }

    if (dto.enable) {
      if (!dto.secret || !dto.code) {
        throw new BadRequestException('Se requiere la clave secreta y el código de verificación de 6 dígitos');
      }

      const isValid = this.twoFactorService.verifyCode(dto.code, dto.secret);
      if (!isValid) {
        throw new BadRequestException('Código de verificación inválido. Comprueba el autenticador.');
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: dto.secret,
          lastActivityAt: new Date(),
        },
      });

      await this.auditService.registrarEvento({
        accion: 'ACTIVACION_2FA_VOLUNTARIA',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.SUCCESS,
        descripcion: `2FA activado voluntariamente por: ${user.nombre} (${user.rol})`,
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        usuarioEmail: user.email,
        usuarioRol: user.rol,
        ip,
        userAgent,
      });

      return { success: true, message: 'Autenticación en dos pasos (2FA) activada correctamente' };
    } else {
      if (!dto.code) {
        throw new BadRequestException('Debes ingresar tu código 2FA actual para confirmar la desactivación');
      }

      const isValid = user.twoFactorSecret ? this.twoFactorService.verifyCode(dto.code, user.twoFactorSecret) : true;
      if (!isValid) {
        throw new BadRequestException('Código 2FA incorrecto. No se puede desactivar la seguridad.');
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          lastActivityAt: new Date(),
        },
      });

      await this.auditService.registrarEvento({
        accion: 'DESACTIVACION_2FA',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.WARNING,
        descripcion: `2FA desactivado por cliente: ${user.nombre} (${user.email})`,
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        usuarioEmail: user.email,
        usuarioRol: user.rol,
        ip,
        userAgent,
      });

      return { success: true, message: 'Autenticación en dos pasos desactivada' };
    }
  }

  // REFRESH TOKEN ROTATIVO (SRS RNF-S06)
  async refreshToken(rawRefreshToken: string, ip?: string, userAgent?: string) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException('Token de actualización no proporcionado');
    }

    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { customer: true, affiliate: true },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Token de actualización inválido');
    }

    if (storedToken.revokedAt) {
      // Posible intento de reuso de token comprometido -> Revocar toda la cadena del usuario por seguridad
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.registrarEvento({
        accion: 'REUSO_REFRESH_TOKEN_DETECTADO',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.CRITICAL,
        descripcion: `Intento de reutilización de refresh token revocado para el usuario ${storedToken.user.email || storedToken.userId}. Se revocaron todas las sesiones activas.`,
        usuarioId: storedToken.userId,
        ip,
        userAgent,
      });

      throw new UnauthorizedException('Sesión revocada por motivos de seguridad. Por favor inicie sesión nuevamente.');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('La sesión ha expirado. Por favor inicie sesión nuevamente.');
    }

    if (!storedToken.user || !storedToken.user.activo || storedToken.user.deletedAt !== null) {
      throw new UnauthorizedException('Usuario inactivo o no disponible.');
    }

    // Revocar el token actual (Rotación estricta)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Actualizar última actividad
    await this.prisma.user.update({
      where: { id: storedToken.userId },
      data: { lastActivityAt: new Date() },
    });

    // Generar nuevo par de tokens
    return this.generateToken(storedToken.user, ip, userAgent);
  }

  // CERRAR SESIÓN / REVOCAR REFRESH TOKEN
  async logout(rawRefreshToken?: string, userId?: string, ip?: string, userAgent?: string) {
    if (rawRefreshToken) {
      const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (userId) {
      await this.auditService.registrarEvento({
        accion: 'CIERRE_SESION',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.INFO,
        descripcion: `Cierre de sesión para el usuario ID ${userId}`,
        usuarioId: userId,
        ip,
        userAgent,
      });
    }

    return { success: true, message: 'Sesión cerrada correctamente' };
  }

  // BUSCAR CUENTA POR CORREO (Endpoint público — exposición mínima)
  async lookupEmail(email: string) {
    if (!email) {
      return { exists: false };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
      select: { activo: true, rol: true },
    });

    if (!user || !user.activo) {
      return { exists: false };
    }

    return {
      exists: true,
      rol: user.rol,
    };
  }

  // GENERADOR DE ACCESS TOKEN (8H) + REFRESH TOKEN ROTATIVO (30D)
  private async generateToken(user: any, ip?: string, userAgent?: string) {
    const payload = {
      sub: user.id,
      email: user.email || user.phone || 'usuario@stream.com',
      rol: user.rol,
      customerId: user.customer?.id || null,
    };

    const token = this.jwtService.sign(payload);

    // Generar refresh token criptográficamente seguro
    const rawRefreshToken = randomBytes(40).toString('hex');
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });

    return {
      access_token: token,
      accessToken: token, // Compatible con frontend Next.js y PWA
      token: token,
      refresh_token: rawRefreshToken,
      refreshToken: rawRefreshToken,
      expiresIn: '8h',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        phone: user.phone,
        whatsapp: user.customer?.whatsapp || user.phone,
        rol: user.rol,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        modulosPermitidos:
          user.rol !== UserRole.CLIENTE && (!user.modulosPermitidos || user.modulosPermitidos.length === 0)
            ? (user.rol === UserRole.ASESOR_COMERCIAL ? ['/admin/seller', '/admin/customers', '/admin/orders'] : ALL_SYSTEM_MODULES)
            : (user.modulosPermitidos || []),
        customerId: user.customer?.id || null,
        saldoBilletera: Number(user.customer?.walletBalance || 0),
        strikes: user.customer?.strikes || 0,
      },
    };
  }
}