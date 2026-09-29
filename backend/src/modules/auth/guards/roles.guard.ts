import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Si no se exige ningún rol, la ruta es pública (para usuarios autenticados)
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    
    // Verificar si el rol del usuario está en la lista de roles permitidos
    const hasRole = requiredRoles.some((role) => user?.rol === role);
    
    if (!hasRole) {
      // Si es un usuario interno del sistema (ADMIN, VENDEDOR, SOPORTE), el Administrador
      // decide su acceso a través de los módulos permitidos. Se permite el acceso a las APIs
      // de los módulos correspondientes, manteniendo únicamente /users exclusivo para ADMIN.
      const isInternal =
        user?.rol === UserRole.ADMIN ||
        user?.rol === UserRole.VENDEDOR ||
        user?.rol === UserRole.SOPORTE ||
        user?.rol === UserRole.ASESOR_COMERCIAL;

      const req = context.switchToHttp().getRequest();
      const path = req.url || '';

      if (isInternal && !path.includes('/users')) {
        return true;
      }

      throw new ForbiddenException('No tienes permisos para acceder a este recurso');
    }
    
    return true;
  }
}