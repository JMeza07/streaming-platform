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
import { UserRole, AuditCategory, AuditSeverity } from '@prisma/client';
import { ALL_SYSTEM_MODULES } from '../users/users.service';

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

    // 1. Verificar si el WhatsApp ya existe en clientes o usuarios
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
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

    // 1.1 Verificar si el teléfono o correo ya pertenece a un usuario del sistema
    const existingUser = await this.prisma.user.findFirst({
      where: {
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

    // 4. Generar Token JWT
    return this.generateToken(user);
  }

  // LOGIN CON REGLAS DE 2FA (Soporta Email, WhatsApp o Teléfono)
  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const rawInput = dto.email ? dto.email.trim() : '';
    const cleanDigits = rawInput.replace(/[\s\-\+\(\)]/g, '');

    // 1. Buscar usuario por email, phone directo en User, o whatsapp en Customer
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: rawInput, mode: 'insensitive' } },
          { phone: rawInput },
          { phone: cleanDigits },
          ...(cleanDigits.length >= 8 ? [{ phone: { contains: cleanDigits.slice(-10) } }] : []),
          { customer: { whatsapp: rawInput } },
          { customer: { whatsapp: cleanDigits } },
          ...(cleanDigits.length >= 8 ? [{ customer: { whatsapp: { contains: cleanDigits.slice(-10) } } }] : []),
        ],
      },
      include: { customer: true, affiliate: true },
    });

    if (!user || !user.activo) {
      await this.auditService.registrarEvento({
        accion: 'FALLO_INICIO_SESION',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.WARNING,
        descripcion: `Intento de acceso fallido para: ${rawInput}`,
        exito: false,
        errorMensaje: 'Usuario no encontrado o suspendido',
        ip,
        userAgent,
        detalles: { input: rawInput },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Validar contraseña
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash || '');
    if (!isPasswordValid) {
      await this.auditService.registrarEvento({
        accion: 'FALLO_INICIO_SESION',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.WARNING,
        descripcion: `Contraseña incorrecta ingresada para usuario: ${user.email || user.phone} (${user.rol})`,
        exito: false,
        errorMensaje: 'Contraseña no válida',
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        usuarioEmail: user.email,
        usuarioRol: user.rol,
        ip,
        userAgent,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Manejo de 2FA
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (dto.twoFactorCode && this.twoFactorService.verifyCode(dto.twoFactorCode, user.twoFactorSecret)) {
        return this.generateToken(user);
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

    return this.generateToken(user);
  }

  // VALIDAR CÓDIGO 2FA DURANTE LOGIN
  async verifyTwoFactor(dto: VerifyTwoFactorDto, ip?: string, userAgent?: string) {
    const payload = this.twoFactorService.validateTempToken(dto.tempToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { customer: true, affiliate: true },
    });

    if (!user || !user.activo || !user.twoFactorSecret) {
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

    return this.generateToken(user);
  }

  // CONFIRMAR Y ACTIVAR CONFIGURACIÓN OBLIGATORIA 2FA (PRIMER LOGIN DE STAFF)
  async setupConfirmTwoFactor(dto: SetupConfirmTwoFactorDto, ip?: string, userAgent?: string) {
    const payload = this.twoFactorService.validateTempToken(dto.tempToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { customer: true, affiliate: true },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no válido o suspendido');
    }

    // Validar el código de 6 dígitos contra el secreto proporcionado
    const isValid = this.twoFactorService.verifyCode(dto.code, dto.secret);
    if (!isValid) {
      throw new BadRequestException('El código ingresado no coincide con el autenticador. Verifica que la hora de tu móvil esté sincronizada.');
    }

    // Guardar 2FA activo en base de datos
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: dto.secret,
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

    return this.generateToken(updatedUser);
  }

  // INICIAR CONFIGURACIÓN DE 2FA VOLUNTARIA (Para clientes desde su panel)
  async generateUserTwoFactorSetup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isMandatory = this.twoFactorService.is2FAMandatory(user.rol);

    // Si es personal del sistema y trata de apagar el 2FA, SE PROHÍBE
    if (isMandatory && !dto.enable) {
      throw new ForbiddenException('La autenticación en dos pasos (Google Authenticator) es obligatoria e inmutable para usuarios administrativos.');
    }

    if (dto.enable) {
      // Activar 2FA
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
      // Desactivar 2FA (solo clientes)
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

  // BUSCAR CUENTA POR CORREO (Endpoint público — exposición mínima)
  async lookupEmail(email: string) {
    if (!email) {
      return { exists: false };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
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

  // GENERADOR DE TOKEN FINAL
  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email || user.phone || 'usuario@stream.com',
      rol: user.rol,
      customerId: user.customer?.id || null,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      accessToken: token, // Compatible con ambos estándares de frontend y PWA
      token: token,
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