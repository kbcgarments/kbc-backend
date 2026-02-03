import { ProductStatus } from '@prisma/client';

export interface ProductSearchDocument {
  id: string;

  // Titles (all languages)
  title_en: string;
  title_es?: string | null;
  title_fr?: string | null;
  title_zu?: string | null;

  title_autocomplete: string;

  // Descriptions (all languages)
  description_en?: string | null;
  description_es?: string | null;
  description_fr?: string | null;
  description_zu?: string | null;

  category: string | null;
  priceUSD: number;
  status: ProductStatus;
  sizes: string[];
  colors: string[];
  createdAt: string;
}

export type ProductSearchSource = {
  id: string;

  title_en: string;
  title_es?: string | null;
  title_fr?: string | null;
  title_zu?: string | null;

  description_en?: string | null;
  description_es?: string | null;
  description_fr?: string | null;
  description_zu?: string | null;

  priceUSD: number;
  status: ProductStatus;
  createdAt: Date;

  category?: { name_en: string } | null;

  variants: {
    sizeId?: string | null;
    colorId?: string | null;
  }[];
};

export function mapProductToSearchDoc(
  product: ProductSearchSource,
): ProductSearchDocument {
  return {
    id: product.id,
    title_en: product.title_en,
    title_es: product.title_es,
    title_fr: product.title_fr,
    title_zu: product.title_zu,

    title_autocomplete: product.title_en,

    description_en: product.description_en,
    description_es: product.description_es,
    description_fr: product.description_fr,
    description_zu: product.description_zu,

    priceUSD: product.priceUSD,
    status: product.status,
    category: product.category?.name_en ?? null,
    sizes: product.variants
      .map((v) => v.sizeId ?? null)
      .filter((v): v is string => Boolean(v)),
    colors: product.variants
      .map((v) => v.colorId ?? null)
      .filter((v): v is string => Boolean(v)),
    createdAt: product.createdAt.toISOString(),
  };
}
