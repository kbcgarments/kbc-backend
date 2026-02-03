import { NotFoundException } from '@nestjs/common';
import { AdminUser, ProductContentType, Prisma } from '@prisma/client';

export interface VariantInput {
  colorId?: string;
  sizeId?: string;
  stock: number;
}

export interface ImageMeta {
  colorId?: string;
  isPrimary?: boolean;
}

export interface ContentSectionInput {
  type: ProductContentType;
  content_en: string;
}

export function actorLabel(actor: AdminUser) {
  return actor.name ?? actor.email;
}

export async function ensureProducts(
  prisma: Prisma.TransactionClient,
  ids: string[],
) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, title_en: true },
  });

  if (!products.length) {
    throw new NotFoundException('No matching products found.');
  }

  return products;
}

export async function syncContentSections(
  tx: Prisma.TransactionClient,
  productId: string,
  sections?: ContentSectionInput[],
) {
  if (!sections?.length) return;

  for (const section of sections) {
    await tx.productContentSection.upsert({
      where: {
        productId_type: {
          productId,
          type: section.type,
        },
      },
      update: {
        content_en: section.content_en,
        content_fr: section.content_en,
        content_es: section.content_en,
        content_zu: section.content_en,
      },
      create: {
        productId,
        type: section.type,
        content_en: section.content_en,
        content_fr: section.content_en,
        content_es: section.content_en,
        content_zu: section.content_en,
      },
    });
  }
}
