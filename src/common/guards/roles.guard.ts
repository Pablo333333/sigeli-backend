import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin @Roles: cualquier usuario autenticado (JwtAuthGuard) puede pasar
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const userRole: Role | undefined = user?.role;

    if (!userRole) {
      throw new ForbiddenException('No se pudo determinar el rol del usuario.');
    }

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Acceso denegado para el rol ${userRole}. Se requiere: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
