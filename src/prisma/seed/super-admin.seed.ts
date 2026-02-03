import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD missing in environment',
    );
  }

  const existing = await prisma.adminUser.findFirst({
    where: { role: AdminRole.SUPER_ADMIN },
  });

  if (existing) {
    console.log('SUPER_ADMIN already exists. Skipping.');
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.adminUser.create({
    data: {
      email,
      password: hash,
      role: AdminRole.SUPER_ADMIN,
      name: 'System Root',
    },
  });
}
