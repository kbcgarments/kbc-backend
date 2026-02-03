import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

interface FilterArgs {
  category?: string;
  sizeIds?: string;
  productTypeIds?: string;
  colorIds?: string;
  stock?: 'in' | 'out';
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  cursor?: string;
  limit: number;
}

@Injectable()
export class ProductsPublicService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string, colorId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: {
          include: { color: true, size: true },
        },
        category: true,
        productContentSections: { orderBy: { order: 'asc' } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    if (colorId) {
      const filteredImages = product.images.filter(
        (img) => img.colorId === colorId,
      );

      return {
        ...product,
        images: filteredImages.length ? filteredImages : product.images,
      };
    }

    return product;
  }

  async listProductsUnified(args: {
    admin?: 'true' | 'all';
    status?: ProductStatus;
    limit: number;
    offset?: number;
  }) {
    const where: Prisma.ProductWhereInput = {};

    if (!args.admin) {
      where.status = ProductStatus.ACTIVE;
    }

    if (args.admin && args.status) {
      where.status = args.status;
    }

    return this.prisma.product.findMany({
      where,
      take: args.limit,
      skip: args.offset ?? 0,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: {
          include: { color: true, size: true },
        },
        category: true,
        productContentSections: { orderBy: { order: 'asc' } },
      },
    });
  }

  async filterProducts(args: FilterArgs) {
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
    };

    if (args.category) {
      where.category = { slug: { in: args.category.split(',') } };
    }

    if (args.minPrice || args.maxPrice) {
      where.priceUSD = {
        ...(args.minPrice && { gte: args.minPrice }),
        ...(args.maxPrice && { lte: args.maxPrice }),
      };
    }

    if (args.productTypeIds) {
      where.productTypeId = { in: args.productTypeIds.split(',') };
    }

    if (args.sizeIds || args.colorIds || args.stock) {
      where.variants = {
        some: {
          ...(args.sizeIds && {
            sizeId: { in: args.sizeIds.split(',') },
          }),
          ...(args.colorIds && {
            colorId: { in: args.colorIds.split(',') },
          }),
          ...(args.stock === 'in' && { stock: { gt: 0 } }),
          ...(args.stock === 'out' && { stock: { lte: 0 } }),
        },
      };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      args.sort === 'price_low'
        ? { priceUSD: 'asc' as const }
        : args.sort === 'price_high'
          ? { priceUSD: 'desc' as const }
          : { createdAt: 'desc' as const };

    const results = await this.prisma.product.findMany({
      where,
      take: args.limit + 1,
      ...(args.cursor && { cursor: { id: args.cursor }, skip: 1 }),
      orderBy,
      include: {
        images: true,
        variants: {
          include: {
            color: true,
            size: true,
          },
        },
        category: true,
        productContentSections: true,
      },
    });

    return {
      items: results.slice(0, args.limit),
      nextCursor:
        results.length > args.limit ? results[args.limit - 1].id : null,
    };
  }

  async getProductColors() {
    return await this.prisma.productColor.findMany({
      orderBy: { label: 'asc' },
      select: {
        id: true,
        key: true,
        label: true,
        hex: true,
      },
    });
  }
  async getProductSizes() {
    return await this.prisma.productSize.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        key: true,
        label: true,
        order: true,
      },
    });
  }

  async getProductAvailableColors(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        variants: {
          select: {
            color: {
              select: {
                id: true,
                key: true,
                label: true,
                hex: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const colorMap = new Map<
      string,
      { id: string; key: string; label: string; hex: string }
    >();

    for (const v of product.variants) {
      if (v.color) {
        colorMap.set(v.color.id, v.color);
      }
    }

    return Array.from(colorMap.values());
  }
  async getProductAvailableSizes(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        variants: {
          select: {
            size: {
              select: {
                id: true,
                key: true,
                label: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const sizeMap = new Map<
      string,
      { id: string; key: string; label: string; order: number }
    >();

    for (const v of product.variants) {
      if (v.size) {
        sizeMap.set(v.size.id, v.size);
      }
    }

    return Array.from(sizeMap.values()).sort((a, b) => a.order - b.order);
  }
}
