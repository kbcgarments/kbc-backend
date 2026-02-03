import { AdminRole } from '@prisma/client';

export interface AdminJwtPayload {
  id: string;
  email: string;
  role: AdminRole;
}
