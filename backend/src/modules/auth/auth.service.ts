import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UserRole, AuditCategory, AuditSeverity } from '@prisma/client';
import { ALL_SYSTEM_MODULES } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  // REGISTRO DE CLIENTE
  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    // 1. Verificar si el email ya existe
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('Este correo ya está registrado');

    // 2. Encriptar contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Crear Usuario y su perfil de Cliente en una sola transacción
    const user = await this.prisma.user.create({
      data: {
        nombre: dto.nombre,
        email: dto.email,
        passwordHash: hashedPassword,
        phone: dto.whatsapp,
        rol: UserRole.CLIENTE,
        // Crear automáticamente el registro en la tabla 'customers'
        customer: {
          create: {
            whatsapp: dto.whatsapp,
            pais: dto.pais,
          },
        },
      },
      include: { customer: true },
    });

    await this.auditService.registrarEvento({
      accion: 'REGISTRO_CLIENTE',
      modulo: AuditCategory.CLIENTES,
      severidad: AuditSeverity.INFO,
      descripcion: `Nuevo cliente registrado en la tienda web: ${user.nombre} (${user.email})`,
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

  // LOGIN
  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    // 1. Buscar usuario por email
    const user = await this.prisma.user.findUnique({ 
      where: { email: dto.email },
      include: { customer: true, affiliate: true }
    });
    
    if (!user || !user.activo) {
      await this.auditService.registrarEvento({
        accion: 'FALLO_INICIO_SESION',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.WARNING,
        descripcion: `Intento de acceso fallido para correo inexistente o inactivo: ${dto.email}`,
        exito: false,
        errorMensaje: 'Usuario no encontrado o suspendido',
        ip,
        userAgent,
        detalles: { email: dto.email },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Validar contraseña
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.registrarEvento({
        accion: 'FALLO_INICIO_SESION',
        modulo: AuditCategory.AUTH,
        severidad: AuditSeverity.WARNING,
        descripcion: `Contraseña incorrecta ingresada para usuario: ${user.email} (${user.rol})`,
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

    // 3. Registrar inicio de sesión exitoso
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

    // 4. Generar Token JWT
    return this.generateToken(user);
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

  // GENERADOR DE TOKEN
  private generateToken(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      rol: user.rol 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        modulosPermitidos:
          user.rol !== UserRole.CLIENTE && (!user.modulosPermitidos || user.modulosPermitidos.length === 0)
            ? (user.rol === UserRole.ASESOR_COMERCIAL ? ['/admin/seller', '/admin/customers', '/admin/orders'] : ALL_SYSTEM_MODULES)
            : (user.modulosPermitidos || []),
        // Si es cliente, devolvemos su ID de customer para el frontend
        customerId: user.customer?.id || null, 
      },
    };
  }
}