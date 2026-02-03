import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AdminJwtPayload } from '../types/admin-jwt-payload';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!requiredRoles) return true;

    const request = ctx.switchToHttp().getRequest<{ user: AdminJwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No admin token provided');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        "You're not authorized to perform this action",
      );
    }

    return true;
  }
}
