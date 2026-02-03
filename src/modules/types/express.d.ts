import { Customer } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      deviceId: string;
      customer?: Pick<Customer, 'id' | 'email' | 'name' | 'deletedAt'> | null;
    }
  }
}
