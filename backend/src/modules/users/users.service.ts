import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, AuditCategory, AuditSeverity } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../audit/audit.service';

export const ALL_SYSTEM_MODULES = [
  '/admin/dashboard',
  '/admin/seller',
  '/admin/customers',
  '/admin/inventory',
  '/admin/sales-accounts',
  '/admin/orders',
  '/admin/renewals',
  '/admin/caja',
  '/admin/catalog',
  '/admin/warranty',
  '/admin/whatsapp',
  '/admin/affiliates',
  '/admin/audit',
  '/admin/users',
  '/admin/reports',
  '/admin/settings',
];

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ==========================================
  // CREAR USUARIO INTERNO DEL SISTEMA (CRUD - C)
  // ==========================================
  async createUser(dto: CreateUserDto) {
    // Los clientes no hacen parte de estos roles
    if (dto.rol === UserRole.CLIENTE) {
      throw new BadRequestException(
        'Los clientes no hacen parte de los roles del sistema operativo. Los clientes se gestionan en el Directorio de Clientes y Portal de Clientes.',
      );
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un usuario registrado con este correo electrónico.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        nombre: dto.nombre.trim(),
        email,
        phone: dto.phone?.trim() || null,
        rol: dto.rol,
        passwordHash,
        activo: dto.activo !== undefined ? dto.activo : true,
        modulosPermitidos:
          dto.modulosPermitidos && dto.modulosPermitidos.length > 0
            ? dto.modulosPermitidos
            : dto.rol === UserRole.ASESOR_COMERCIAL
            ? ['/admin/seller', '/admin/customers', '/admin/orders']
            : ALL_SYSTEM_MODULES,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        phone: true,
        rol: true,
        activo: true,
        modulosPermitidos: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Si el rol es VENDEDOR o ASESOR_COMERCIAL, asegurar que tenga registro en Affiliate para comisiones
    if (user.rol === UserRole.VENDEDOR || user.rol === UserRole.ASESOR_COMERCIAL) {
      const existingAffiliate = await this.prisma.affiliate.findUnique({
        where: { userId: user.id },
      });
      if (!existingAffiliate) {
        const uniqueCode = `${user.nombre.substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
        await this.prisma.affiliate.create({
          data: {
            userId: user.id,
            codigoReferido: uniqueCode,
          },
        });
      }
    }

    await this.auditService.registrarEvento({
      modulo: AuditCategory.USUARIOS,
      accion: 'CREACION_USUARIO',
      severidad: AuditSeverity.SUCCESS,
      descripcion: `Nuevo usuario interno creado: ${user.nombre} (${user.email}, ${user.rol}) con ${user.modulosPermitidos.length} módulos personalizados`,
      entidadTipo: 'User',
      entidadId: user.id,
      detalles: {
        usuarioCreadoId: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        modulosPermitidos: user.modulosPermitidos,
      },
      exito: true,
    });

    return user;
  }

  // ==========================================
  // LISTAR USUARIOS INTERNOS (CRUD - R)
  // ==========================================
  async findAll(rol?: UserRole, includeClients: boolean = false) {
    let whereClause: any = {};

    if (rol) {
      if (rol === UserRole.CLIENTE && !includeClients) {
        // Los clientes no hacen parte de este panel
        return [];
      }
      whereClause.rol = rol;
    } else if (!includeClients) {
      // Por defecto, este panel excluye CLIENTE: solo lista ADMIN, VENDEDOR, SOPORTE, ASESOR_COMERCIAL
      whereClause.rol = {
        in: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL],
      };
    }

    return this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        email: true,
        phone: true,
        rol: true,
        activo: true,
        modulosPermitidos: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ventasRealizadas: true,
          },
        },
      },
      orderBy: [
        { rol: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  // ==========================================
  // OBTENER DETALLE DE USUARIO (CRUD - R)
  // ==========================================
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        phone: true,
        rol: true,
        activo: true,
        modulosPermitidos: true,
        createdAt: true,
        updatedAt: true,
        affiliate: {
          select: {
            id: true,
            codigoReferido: true,
            rango: true,
            walletBalance: true,
          },
        },
        _count: {
          select: {
            ventasRealizadas: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  // ==========================================
  // ACTUALIZAR USUARIO INTERNO (CRUD - U)
  // ==========================================
  async updateUser(id: string, dto: UpdateUserDto, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // No permitir asignar rol CLIENTE desde este módulo
    if (dto.rol === UserRole.CLIENTE) {
      throw new BadRequestException(
        'No se puede asignar el rol CLIENTE a un usuario del sistema operativo.',
      );
    }

    // Validar colisión de correo
    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      if (email !== user.email.toLowerCase()) {
        const collision = await this.prisma.user.findUnique({ where: { email } });
        if (collision && collision.id !== id) {
          throw new BadRequestException('Ya existe otro usuario registrado con este correo electrónico.');
        }
      }
    }

    // Proteger al último administrador activo de degradación o suspensión
    if (user.rol === UserRole.ADMIN && (
      (dto.rol && dto.rol !== UserRole.ADMIN) ||
      dto.activo === false
    )) {
      const otherAdmins = await this.prisma.user.count({
        where: {
          rol: UserRole.ADMIN,
          activo: true,
          id: { not: id },
        },
      });
      if (otherAdmins < 1) {
        throw new BadRequestException('No puedes suspender o cambiar de rol al único administrador activo del sistema.');
      }
    }

    // Prevenir auto-suspensión accidental
    if (currentUserId && id === currentUserId && dto.activo === false) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta activa con la que has iniciado sesión.');
    }

    let passwordHash: string | undefined = undefined;
    if (dto.password && dto.password.trim().length >= 6) {
      passwordHash = await bcrypt.hash(dto.password.trim(), 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.nombre && { nombre: dto.nombre.trim() }),
        ...(dto.email && { email: dto.email.toLowerCase().trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.rol && { rol: dto.rol }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
        ...(dto.modulosPermitidos !== undefined && { modulosPermitidos: dto.modulosPermitidos }),
        ...(passwordHash && { passwordHash }),
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        phone: true,
        rol: true,
        activo: true,
        modulosPermitidos: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Si se promovió a VENDEDOR o ASESOR_COMERCIAL, asegurar perfil de afiliado
    if (updated.rol === UserRole.VENDEDOR || updated.rol === UserRole.ASESOR_COMERCIAL) {
      const existingAffiliate = await this.prisma.affiliate.findUnique({
        where: { userId: updated.id },
      });
      if (!existingAffiliate) {
        const uniqueCode = `${updated.nombre.substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
        await this.prisma.affiliate.create({
          data: {
            userId: updated.id,
            codigoReferido: uniqueCode,
          },
        });
      }
    }

    await this.auditService.registrarEvento({
      usuarioId: currentUserId,
      modulo: AuditCategory.USUARIOS,
      accion: 'EDICION_USUARIO',
      severidad: AuditSeverity.INFO,
      descripcion: `Usuario interno "${updated.nombre}" (${updated.email}, ${updated.rol}) actualizado`,
      entidadTipo: 'User',
      entidadId: updated.id,
      detalles: {
        userId: updated.id,
        nombre: updated.nombre,
        email: updated.email,
        rol: updated.rol,
        modulosPermitidos: updated.modulosPermitidos,
      },
      exito: true,
    });

    return updated;
  }

  // ==========================================
  // ACTIVAR O DESACTIVAR MÓDULOS DE UN USUARIO (EXCLUSIVO ADMINISTRADOR)
  // ==========================================
  async updateUserModules(id: string, modulosPermitidos: string[], currentUserId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { modulosPermitidos },
      select: {
        id: true,
        nombre: true,
        email: true,
        phone: true,
        rol: true,
        activo: true,
        modulosPermitidos: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.registrarEvento({
      usuarioId: currentUserId,
      modulo: AuditCategory.USUARIOS,
      accion: 'MODIFICACION_MODULOS_USUARIO',
      severidad: AuditSeverity.WARNING,
      descripcion: `Módulos de acceso actualizados por el Administrador para el usuario "${user.nombre}" (${user.email}, ${user.rol}). Total módulos activos: ${modulosPermitidos.length}`,
      entidadTipo: 'User',
      entidadId: id,
      detalles: {
        userId: id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        modulosAsignados: modulosPermitidos,
      },
      exito: true,
    });

    return updated;
  }

  // ==========================================
  // ALTERNAR ESTADO ACTIVO / SUSPENDIDO
  // ==========================================
  async toggleActive(id: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (currentUserId && id === currentUserId) {
      throw new BadRequestException('No puedes suspender tu propia cuenta activa.');
    }

    // Prevenir auto-bloqueo del Administrador principal si es el único
    if (user.rol === UserRole.ADMIN && user.activo) {
      const adminsCount = await this.prisma.user.count({
        where: { rol: UserRole.ADMIN, activo: true, id: { not: id } },
      });
      if (adminsCount < 1) {
        throw new BadRequestException('No puedes suspender al único administrador activo del sistema.');
      }
    }

    const nuevoEstado = !user.activo;

    return this.prisma.user.update({
      where: { id },
      data: { activo: nuevoEstado },
      select: {
        id: true,
        nombre: true,
        email: true,
        phone: true,
        rol: true,
        activo: true,
        updatedAt: true,
      },
    });
  }

  // ==========================================
  // ELIMINAR USUARIO INTERNO (CRUD - D)
  // ==========================================
  async deleteUser(id: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (currentUserId && id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta en sesión.');
    }

    if (user.rol === UserRole.ADMIN) {
      const otherAdmins = await this.prisma.user.count({
        where: { rol: UserRole.ADMIN, id: { not: id } },
      });
      if (otherAdmins < 1) {
        throw new BadRequestException('No puedes eliminar al único administrador del sistema.');
      }
    }

    // Verificar si tiene ventas realizadas (clave foránea en órdenes)
    const salesCount = await this.prisma.order.count({
      where: { vendedorId: id },
    });

    if (salesCount > 0) {
      // Para no romper la integridad de auditoría y contabilidad, suspendemos al usuario
      await this.prisma.user.update({
        where: { id },
        data: { activo: false },
      });
      return {
        success: true,
        action: 'suspended',
        message: `El usuario tiene ${salesCount} venta(s) asociadas en el sistema. Por seguridad contable, su cuenta fue suspendida en lugar de borrarse físicamente.`,
        userId: id,
      };
    }

    // Eliminar relaciones accesorias si existen (afiliado)
    await this.prisma.affiliate.deleteMany({ where: { userId: id } });

    // Eliminar usuario
    await this.prisma.user.delete({ where: { id } });

    return {
      success: true,
      action: 'deleted',
      message: 'Usuario eliminado permanentemente del sistema.',
      userId: id,
    };
  }

  // ==========================================
  // MATRIZ DE ROLES Y PERMISOS DEL SISTEMA
  // ==========================================
  getRolesMatrix() {
    return [
      {
        rol: UserRole.ADMIN,
        codigo: 'ADMIN',
        nombre: 'Administrador del Sistema',
        descripcion: 'Control total de la infraestructura, usuarios, finanzas, inventarios, configuraciones y reportes.',
        color: 'red',
        badge: 'bg-red-500/10 text-red-400 border-red-500/20',
        permisos: [
          'Gestión total de Usuarios y Roles (CRUD)',
          'Administración de Inventario de Cuentas y Lotes',
          'Arqueo de Caja y Movimientos Financieros',
          'Aprobación, Anulación y Reembolso de Órdenes',
          'Mesa de Soporte, Garantías y Reemplazos FIFO',
          'Gestión de Catálogo (Servicios y Planes)',
          'WhatsApp CRM, Conexión y Automatizaciones',
          'Configuración Global y Respaldo / Backups JSON',
          'Auditoría e Informes de Ingresos',
        ],
      },
      {
        rol: UserRole.SOPORTE,
        codigo: 'SOPORTE',
        nombre: 'Agente de Soporte & Garantías',
        descripcion: 'Atención de garantías de clientes, reemplazo inmediato de cuentas defectuosas e inspección de stock.',
        color: 'blue',
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        permisos: [
          'Acceso a Mesa de Soporte y Tickets de Garantía',
          'Aprobación de garantías y reemplazos de cuentas',
          'Botón de Asignación Inmediata de Cuenta (FIFO)',
          'Consulta en tiempo real del inventario disponible',
          'Consulta del historial de órdenes de clientes',
          'Seguimiento y resolución de quejas postventa',
        ],
      },
      {
        rol: UserRole.VENDEDOR,
        codigo: 'VENDEDOR',
        nombre: 'Asesor de Ventas / Afiliado',
        descripcion: 'Generación de órdenes comerciales, seguimiento de clientes asignados y cobro de comisiones.',
        color: 'emerald',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        permisos: [
          'Creación y registro de Órdenes de Venta',
          'Consulta del catálogo de planes y precios en tiempo real',
          'Verificación de stock de cuentas disponible',
          'Mi Perfil de Vendedor: Balance y comisiones',
          'Solicitud de retiros de saldo acumulado',
        ],
      },
      {
        rol: UserRole.ASESOR_COMERCIAL,
        codigo: 'ASESOR_COMERCIAL',
        nombre: 'Asesor Comercial',
        descripcion: 'Venta por enlace de afiliación y seguimiento exclusivo de sus clientes suscritos y comisiones generadas.',
        color: 'amber',
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        permisos: [
          'Enlace exclusivo de afiliación para captación de clientes',
          'Consulta exclusiva de clientes referidos con suscripción',
          'Monitoreo de ganancias personales y billetera virtual',
          'Solicitud de retiros de comisiones devengadas',
          'Catálogo de streaming con margen de ganancias',
        ],
      },
    ];
  }
}
