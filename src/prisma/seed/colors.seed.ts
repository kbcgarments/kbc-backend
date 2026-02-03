// prisma/seeds/colors.seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = [
  { key: 'BLACK', label: 'Black', hex: '#000000' },
  { key: 'WHITE', label: 'White', hex: '#FFFFFF' },
  { key: 'RED', label: 'Red', hex: '#E74C3C' },
  { key: 'BLUE', label: 'Blue', hex: '#3498DB' },
  { key: 'NAVY_BLUE', label: 'Navy Blue', hex: '#1A2F4B' },
  { key: 'PINK', label: 'Pink', hex: '#F8B4C8' },
  { key: 'BURGUNDY', label: 'Burgundy', hex: '#800020' },
  { key: 'BROWN', label: 'Brown', hex: '#8B6F47' },
  { key: 'BEIGE', label: 'Beige', hex: '#F5F5DC' },
  { key: 'CREAM', label: 'Cream', hex: '#FFFDD0' },
  { key: 'GRAY', label: 'Gray', hex: '#808080' },
  { key: 'SILVER', label: 'Silver', hex: '#C0C0C0' },
  { key: 'MINT', label: 'Mint', hex: '#98FF98' },
  { key: 'TEAL', label: 'Teal', hex: '#008080' },
  { key: 'CYAN', label: 'Cyan', hex: '#00BCD4' },
  { key: 'OLIVE', label: 'Olive', hex: '#6B7C3C' },
  { key: 'MUSTARD', label: 'Mustard', hex: '#FFDB58' },
  { key: 'ORANGE', label: 'Orange', hex: '#FF9800' },
  { key: 'GREEN', label: 'Green', hex: '#4CAF50' },
  { key: 'CHARCOAL', label: 'Charcoal', hex: '#36454F' },
  { key: 'MAROON', label: 'Maroon', hex: '#800000' },
  { key: 'ROSE', label: 'Rose', hex: '#FF66B2' },
  { key: 'SKY_BLUE', label: 'Sky Blue', hex: '#87CEEB' },
];

export async function seedColors() {
  console.log('🎨 Seeding colors...');

  for (const color of colors) {
    await prisma.productColor.upsert({
      where: { key: color.key },
      update: {
        label: color.label,
        hex: color.hex,
      },
      create: {
        key: color.key,
        label: color.label,
        hex: color.hex,
      },
    });
  }

  console.log(`✅ Seeded ${colors.length} colors`);
}
