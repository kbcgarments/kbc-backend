// src/modules/commerce/commerce.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { HomepageTestimonialDto } from './dto/homepage-response.dto';

type TakeQuery = { take?: number };

@Injectable()
export class CommerceService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------- HERO ---------------- */

  async getHero() {
    return this.prisma.heroSection.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /* ---------------- BANNERS ---------------- */

  async getBanners() {
    return this.prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ---------------- FEATURED PRODUCTS ----------------
     NOTE: keep it lean; include only what homepage needs
  ---------------------------------------------------- */

  async getFeaturedProducts({ take = 8 }: TakeQuery = {}) {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        images: { some: {} },
        variants: { some: { stock: { gt: 0 } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: { include: { color: true, size: true } },
        category: true,
      },
    });
  }

  /* ---------------- NEW ARRIVALS ---------------- */

  async getNewArrivals({ take = 12 }: TakeQuery = {}) {
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: { include: { color: true, size: true } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /* ---------------- BEST SELLERS ----------------
     1) groupBy orderItem
     2) fetch products
     NOTE: keep ordering stable based on groupBy output
  ------------------------------------------------ */

  async getBestSellers({ take = 8 }: TakeQuery = {}) {
    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take,
    });

    if (!rows.length) return [];

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: rows.map((r) => r.productId) },
        status: 'ACTIVE',
      },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: { include: { color: true, size: true } },
        category: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // return in ranked order
    return rows
      .map((r) => productMap.get(r.productId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }

  /* ---------------- WHY CHOOSE US ---------------- */

  async getWhyChooseUs() {
    return this.prisma.whyChooseUs.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async getTestimonials({ take = 6 }: TakeQuery = {}): Promise<
    HomepageTestimonialDto[]
  > {
    const testimonials = await this.prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take,
    });

    return testimonials.map((t) => ({
      id: t.id,
      customerName: t.customerName,
      rating: t.rating ?? null,

      quote_en: t.quote_en,
      quote_fr: t.quote_fr ?? t.quote_en,
      quote_es: t.quote_es ?? t.quote_en,
      quote_zu: t.quote_zu ?? t.quote_en,

      productTitle_en: t.productTitle_en ?? 'Product',
      productTitle_fr: t.productTitle_fr ?? t.productTitle_en ?? 'Product',
      productTitle_es: t.productTitle_es ?? t.productTitle_en ?? 'Product',
      productTitle_zu: t.productTitle_zu ?? t.productTitle_en ?? 'Product',

      createdAt: t.createdAt,
    }));
  }
}
