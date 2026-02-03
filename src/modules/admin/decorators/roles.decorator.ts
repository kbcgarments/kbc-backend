import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

export const SuperAdminOnly = () =>
  SetMetadata(ROLES_KEY, [AdminRole.SUPER_ADMIN]);

export const AdminOnly = () =>
  SetMetadata(ROLES_KEY, [AdminRole.ADMIN, AdminRole.SUPER_ADMIN]);

export const CatalogManagerOnly = () =>
  SetMetadata(ROLES_KEY, [
    AdminRole.SUPER_ADMIN,
    AdminRole.ADMIN,
    AdminRole.STAFF,
  ]);
