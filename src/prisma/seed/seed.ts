import { PrismaClient } from '@prisma/client';
import { seedSuperAdmin } from './super-admin.seed';
import { seedColors } from './colors.seed';
import { seedSizes } from './sizes.seed';

const prisma = new PrismaClient();

async function main() {
  await seedSuperAdmin();
  await seedColors();
  await seedSizes();
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
