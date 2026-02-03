// prisma/seeds/sizes.seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sizes = [
  { key: 'XXS', label: 'XXS', order: 1 },
  { key: 'XS', label: 'XS', order: 2 },
  { key: 'S', label: 'S', order: 3 },
  { key: 'M', label: 'M', order: 4 },
  { key: 'L', label: 'L', order: 5 },
  { key: 'XL', label: 'XL', order: 6 },
  { key: 'XXL', label: 'XXL', order: 7 },
  { key: '3XL', label: '3XL', order: 8 },
  { key: '4XL', label: '4XL', order: 9 },
  { key: '5XL', label: '5XL', order: 10 },

  // Numeric sizes (optional - include if you sell shoes/accessories)
  { key: 'SIZE_6', label: '6', order: 11 },
  { key: 'SIZE_6_5', label: '6.5', order: 12 },
  { key: 'SIZE_7', label: '7', order: 13 },
  { key: 'SIZE_7_5', label: '7.5', order: 14 },
  { key: 'SIZE_8', label: '8', order: 15 },
  { key: 'SIZE_8_5', label: '8.5', order: 16 },
  { key: 'SIZE_9', label: '9', order: 17 },
  { key: 'SIZE_9_5', label: '9.5', order: 18 },
  { key: 'SIZE_10', label: '10', order: 19 },
  { key: 'SIZE_10_5', label: '10.5', order: 20 },
  { key: 'SIZE_11', label: '11', order: 21 },
  { key: 'SIZE_11_5', label: '11.5', order: 22 },
  { key: 'SIZE_12', label: '12', order: 23 },
  { key: 'SIZE_12_5', label: '12.5', order: 24 },
  { key: 'SIZE_13', label: '13', order: 25 },

  // One size fits all
  { key: 'ONE_SIZE', label: 'One Size', order: 99 },
];

export async function seedSizes() {
  console.log('📏 Seeding sizes...');

  for (const size of sizes) {
    await prisma.productSize.upsert({
      where: { key: size.key },
      update: {
        label: size.label,
        order: size.order,
      },
      create: {
        key: size.key,
        label: size.label,
        order: size.order,
      },
    });
  }

  console.log(`✅ Seeded ${sizes.length} sizes`);
}
