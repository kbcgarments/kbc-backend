// commerce/commerce.service.ts
import { Injectable } from '@nestjs/common';
import {
  HomepageResponseDto,
  HomepageTestimonialDto,
} from './dto/homepage-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommerceService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomepage(): Promise<HomepageResponseDto> {
    const [
      hero,
      banners,
      featuredProducts,
      bestSellers,
      newArrivals,
      testimonials,
      whyChooseUs,
    ] = await Promise.all([
      this.getActiveHero(),
      this.getBanners(),
      this.getFeaturedProducts(),
      this.getBestSellers(),
      this.getNewArrivals(),
      this.getTestimonials(),
      this.getWhyChooseUs(),
    ]);

    return {
      hero,
      banners,
      featuredProducts,
      bestSellers,
      newArrivals,
      testimonials,
      whyChooseUs,
    };
  }

  /* ---------------- HERO ---------------- */

  private getActiveHero() {
    return this.prisma.heroSection.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /* ---------------- BANNER CTA ---------------- */

  private getBanners() {
    return this.prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ---------------- FEATURED PRODUCTS ---------------- */

  private getFeaturedProducts() {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        images: { some: {} },
        variants: {
          some: { stock: { gt: 0 } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        images: true,
        variants: true,
      },
    });
  }

  /* ---------------- BEST SELLERS ---------------- */

  private async getBestSellers() {
    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    });

    if (!rows.length) return [];

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: rows.map((r) => r.productId) },
        status: 'ACTIVE',
      },
      include: {
        images: true,
        variants: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return rows
      .map((r) => productMap.get(r.productId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }

  /* ---------------- TESTIMONIALS ---------------- */

  private async getTestimonials(): Promise<HomepageTestimonialDto[]> {
    const testimonials = await this.prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 6,
      include: {
        feedback: {
          include: {
            order: {
              include: {
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return testimonials.map((t) => {
      const product = t.feedback?.order?.items?.[0]?.product;
      return {
        id: t.id,
        customerName: t.customerName,
        rating: t.rating,

        // Localized quote
        quote_en: t.quote_en,
        quote_fr: t.quote_fr ?? t.quote_en,
        quote_es: t.quote_es ?? t.quote_en,
        quote_zu: t.quote_zu ?? t.quote_en,

        // Localized product title
        productTitle_en: product?.title_en ?? 'Product',
        productTitle_fr: product?.title_fr ?? product?.title_en ?? 'Product',
        productTitle_es: product?.title_es ?? product?.title_en ?? 'Product',
        productTitle_zu: product?.title_zu ?? product?.title_en ?? 'Product',

        createdAt: t.createdAt,
      };
    });
  }

  /* ---------------- WHY CHOOSE US ---------------- */

  private getWhyChooseUs() {
    return this.prisma.whyChooseUs.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  /* ======================================================
     New Arrivals
  ====================================================== */
  async getNewArrivals(limit = 12) {
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
