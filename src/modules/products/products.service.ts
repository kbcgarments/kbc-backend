/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminUser,
  ActivityType,
  ProductStatus,
  ProductContentType,
  Prisma,
  ProductVariant,
} from '@prisma/client';
import { SupabaseUploadService } from 'src/common/utils/supabase-upload.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { logActivity } from '../activity/activity-logger.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { TranslationService } from './translation.service';
import { Client } from '@elastic/elasticsearch';
import { mapProductToSearchDoc } from '../search/search.utils';
import { EMAIL_TEMPLATE_MAP } from '../notifications/email/email.templates';
import { EmailEvent } from '../notifications/email/email.types';
import { EmailService } from '../notifications/email/email.service';

/* ======================================================
   TYPES
====================================================== */

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

type VariantInput = {
  colorId?: string;
  sizeId?: string;
  stock: number;
};

type ImageMeta = {
  colorId?: string;
  isPrimary?: boolean;
};

type ContentSectionInput = {
  type: ProductContentType;
  content_en: string;
};

/* ======================================================
   SERVICE
====================================================== */

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translator: TranslationService,
    private readonly uploader: SupabaseUploadService,
    private readonly emailService: EmailService,
    @Inject('ELASTICSEARCH_CLIENT')
    private readonly es: Client,
  ) {}

  /* ======================================================
     HELPERS
  ====================================================== */

  private actorLabel(actor: AdminUser) {
    return actor.name ?? actor.email;
  }

  private async ensureProducts(ids: string[]) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, title_en: true },
    });

    if (!products.length) {
      throw new NotFoundException('No matching products found.');
    }

    return products;
  }

  private async syncContentSections(
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
  /* ======================================================
     CREATE
  ====================================================== */

  async create(
    actor: AdminUser,
    dto: CreateProductDto,
    files: Express.Multer.File[],
    variantsJson: string,
  ) {
    if (!files.length) {
      throw new BadRequestException('At least one image is required.');
    }

    const variants = JSON.parse(variantsJson) as VariantInput[];
    if (!variants.length) {
      throw new BadRequestException('At least one variant is required.');
    }

    const imageMeta = JSON.parse(dto.imageMeta ?? '[]') as ImageMeta[];
    if (imageMeta.length !== files.length) {
      throw new BadRequestException('imageMeta must match image count.');
    }

    const translations = await this.translator.translateObject({
      title_en: dto.title_en,
      description_en: dto.description_en,
    });

    const imageUrls = await this.uploader.uploadFiles(files);

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          title_en: dto.title_en,
          description_en: dto.description_en,
          productTypeId: dto.productTypeId,
          priceUSD: dto.priceUSD,
          status: ProductStatus.ACTIVE,
          categoryId: dto.categoryId ?? null,

          ...translations,

          images: {
            create: imageUrls.map((url, i) => ({
              url,
              order: i,
              colorId: imageMeta[i]?.colorId ?? null,
              isPrimary: imageMeta[i]?.isPrimary ?? false,
            })),
          },

          variants: {
            create: variants.map((v) => ({
              colorId: v.colorId ?? null,
              sizeId: v.sizeId ?? null,
              stock: v.stock,
            })),
          },
        },
      });

      const contentSections = dto.contentSections
        ? (JSON.parse(dto.contentSections) as ContentSectionInput[])
        : undefined;

      await this.syncContentSections(tx, created.id, contentSections);

      return created;
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.PRODUCT_CREATED,
      entity: 'Product',
      entityId: product.id,
      message: `${this.actorLabel(actor)} created "${product.title_en}".`,
    });

    const fullProduct = await this.prisma.product.findUnique({
      where: { id: product.id },
      include: {
        variants: { include: { color: true, size: true } },
        category: { select: { name_en: true } },
      },
    });

    if (fullProduct) {
      await this.es.index({
        index: process.env.ELASTICSEARCH_INDEX_PRODUCTS!,
        id: fullProduct.id,
        document: mapProductToSearchDoc(fullProduct),
      });
    }

    return product;
  }

  /* ======================================================
     READ
  ====================================================== */

  async findOne(id: string, colorId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: {
          include: {
            color: true,
            size: true,
          },
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

    /**
     * 👇 USER MODE (default)
     * No admin flag → only ACTIVE products
     */
    if (!args.admin) {
      where.status = ProductStatus.ACTIVE;
    }

    /**
     * 👇 ADMIN MODE
     * admin=true or admin=all → see everything
     * optional status override
     */
    if (args.admin && args.status) {
      where.status = args.status;
    }

    const products = await this.prisma.product.findMany({
      where,
      take: args.limit,
      skip: args.offset ?? 0,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: {
          include: {
            color: true,
            size: true,
          },
        },
        category: true,
        productContentSections: { orderBy: { order: 'asc' } },
      },
    });

    return products;
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

  /* ======================================================
     UPDATE
  ====================================================== */

  async update(
    actor: AdminUser,
    id: string,
    dto: UpdateProductDto,
    files?: Express.Multer.File[],
    variantsJson?: string,
    newImageMeta?: string,
  ) {
    const existing = await this.findOne(id);

    const translationInput = {
      title_en: dto.title_en,
      description_en: dto.description_en,
    };

    const translations =
      dto.title_en || dto.description_en
        ? await this.translator.translateObject(translationInput)
        : {};

    // PRELOAD PRODUCT - used for email alerts
    const baseProduct = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    const LOW_STOCK_THRESHOLD = 5;

    // will store queued alerts to send AFTER transaction
    const queuedAlerts: Array<{
      type: 'low' | 'out';
      variant: ProductVariant & {
        color: { label: string } | null;
        size: { label: string } | null;
      };
      stockLevel: number;
    }> = [];

    /* ======================================================
       TRANSACTION (NO EMAIL INSIDE)
    ====================================================== */
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(dto.title_en && { title_en: dto.title_en }),
          ...(dto.description_en && { description_en: dto.description_en }),
          ...translations,
          ...(dto.priceUSD !== undefined && { priceUSD: dto.priceUSD }),
          ...(dto.status && { status: dto.status }),
          ...(dto.categoryId !== undefined && {
            categoryId: dto.categoryId ?? null,
          }),
        },
      });

      /* ======================================================
         IMAGES
      ====================================================== */
      if (files?.length) {
        const meta = JSON.parse(newImageMeta ?? '[]') as ImageMeta[];
        const urls = await this.uploader.uploadFiles(files);

        await tx.productImage.createMany({
          data: urls.map((url, i) => ({
            productId: id,
            url,
            colorId: meta[i]?.colorId ?? null,
            isPrimary: meta[i]?.isPrimary ?? false,
          })),
        });
      }

      /* ======================================================
         VARIANTS
      ====================================================== */
      if (variantsJson) {
        const incoming = JSON.parse(variantsJson) as VariantInput[];

        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
          include: { cartItems: true, color: true, size: true },
        });

        const existingMap = new Map(
          existingVariants.map((v) => [`${v.colorId}-${v.sizeId}`, v]),
        );

        for (const v of incoming) {
          const key = `${v.colorId ?? null}-${v.sizeId ?? null}`;
          const existing = existingMap.get(key);
          const newStock = v.stock;

          if (existing) {
            // update stock
            await tx.productVariant.update({
              where: { id: existing.id },
              data: { stock: newStock },
            });

            existingMap.delete(key);

            // LOW STOCK ALERT ⇒ queue after transaction
            if (
              newStock > 0 &&
              newStock <= LOW_STOCK_THRESHOLD &&
              !existing.lowStockAlertSent
            ) {
              queuedAlerts.push({
                type: 'low',
                variant: existing,
                stockLevel: newStock,
              });

              await tx.productVariant.update({
                where: { id: existing.id },
                data: { lowStockAlertSent: true },
              });
            }

            // OUT OF STOCK ALERT ⇒ queue after transaction
            if (newStock === 0 && !existing.outOfStockAlertSent) {
              queuedAlerts.push({
                type: 'out',
                variant: existing,
                stockLevel: 0,
              });

              await tx.productVariant.update({
                where: { id: existing.id },
                data: { outOfStockAlertSent: true },
              });
            }

            // RESET ALERT FLAGS when fully restocked
            if (newStock > LOW_STOCK_THRESHOLD) {
              await tx.productVariant.update({
                where: { id: existing.id },
                data: { lowStockAlertSent: false, outOfStockAlertSent: false },
              });
            }
          } else {
            // create new variant
            await tx.productVariant.create({
              data: {
                productId: id,
                colorId: v.colorId ?? null,
                sizeId: v.sizeId ?? null,
                stock: v.stock,
              },
            });
          }
        }

        // delete unused variants
        for (const leftover of existingMap.values()) {
          if (leftover.cartItems.length === 0) {
            await tx.productVariant.delete({ where: { id: leftover.id } });
          }
        }
      }

      /* ======================================================
         CONTENT SECTIONS
      ====================================================== */
      const sections = dto.contentSections
        ? (JSON.parse(dto.contentSections) as ContentSectionInput[])
        : undefined;

      await this.syncContentSections(tx, id, sections);
    });

    /* ======================================================
       SEND ALERT EMAILS — OUTSIDE TRANSACTION
    ====================================================== */
    for (const alert of queuedAlerts) {
      const variant = alert.variant;
      const variantLabel = `${variant?.color?.label ?? 'N/A'} / ${
        variant?.size?.label ?? 'N/A'
      }`;

      const params = {
        date: new Date().toLocaleDateString(),
        productCount: 1,
        dashboardLink: `${process.env.ADMIN_DASHBOARD_URL}/products/${id}`,
        products: [
          {
            name: baseProduct?.title_en,
            description: baseProduct?.description_en,
            variants: variantLabel,
            stockLevel: alert.stockLevel,
          },
        ],
      };

      await this.emailService.sendTemplate({
        to: process.env.ADMIN_ORDER_EMAIL ?? 'sales@kbcuniverse.org',
        templateId:
          alert.type === 'low'
            ? EMAIL_TEMPLATE_MAP[EmailEvent.LOW_STOCK_ALERT]
            : EMAIL_TEMPLATE_MAP[EmailEvent.OUT_OF_STOCK_ALERT],
        params,
      });
    }

    /* ======================================================
       LOG + REINDEX
    ====================================================== */
    await logActivity(this.prisma, {
      actor,
      action: ActivityType.PRODUCT_UPDATED,
      entity: 'Product',
      entityId: id,
      message: `${this.actorLabel(actor)} updated "${existing.title_en}".`,
    });

    const updated = await this.findOne(id);

    await this.es.index({
      index: process.env.ELASTICSEARCH_INDEX_PRODUCTS!,
      id: updated.id,
      document: mapProductToSearchDoc(updated),
    });

    return updated;
  }

  /* ======================================================
     ARCHIVE / RESTORE / DELETE
  ====================================================== */

  async archiveMany(actor: AdminUser, ids: string[]) {
    const products = await this.ensureProducts(ids);

    await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status: ProductStatus.ARCHIVED },
    });

    for (const p of products) {
      await logActivity(this.prisma, {
        actor,
        action: ActivityType.PRODUCT_ARCHIVED,
        entity: 'Product',
        entityId: p.id,
        message: `${this.actorLabel(actor)} archived "${p.title_en}".`,
      });
    }

    return { archivedCount: products.length };
  }

  async restoreMany(actor: AdminUser, ids: string[]) {
    await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status: ProductStatus.ACTIVE },
    });

    return { restoredCount: ids.length };
  }

  async hardDelete(actor: AdminUser, ids: string | string[]) {
    const idList = Array.isArray(ids) ? ids : [ids];
    const products = await this.ensureProducts(idList);

    // Block deletion if product was ordered
    const orderCount = await this.prisma.orderItem.count({
      where: { productId: { in: idList } },
    });

    if (orderCount > 0) {
      throw new BadRequestException(
        'Cannot hard delete products that have been ordered. Archive instead.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Cart items
      await tx.cartItem.deleteMany({
        where: { productId: { in: idList } },
      });

      // 2️⃣ Wishlist items
      await tx.wishlistItem.deleteMany({
        where: { productId: { in: idList } },
      });

      // 3️⃣ Images (DB only — files handled separately)
      const images = await tx.productImage.findMany({
        where: { productId: { in: idList } },
      });

      await tx.productImage.deleteMany({
        where: { productId: { in: idList } },
      });
      await tx.productContentSection.deleteMany({
        where: { productId: { in: idList } },
      });

      await tx.productVariant.deleteMany({
        where: { productId: { in: idList } },
      });

      await tx.product.deleteMany({
        where: { id: { in: idList } },
      });

      const filenames = images
        .map((i) => i.url.split('/').pop())
        .filter(Boolean) as string[];

      if (filenames.length) {
        await this.uploader.deleteFiles(filenames);
      }
    });

    for (const p of products) {
      await logActivity(this.prisma, {
        actor,
        action: ActivityType.PRODUCT_HARD_DELETED,
        entity: 'Product',
        entityId: p.id,
        message: `${this.actorLabel(actor)} permanently deleted "${p.title_en}".`,
      });

      await this.es.delete({
        index: process.env.ELASTICSEARCH_INDEX_PRODUCTS!,
        id: p.id,
      });
    }

    return { deletedCount: products.length };
  }

  async deleteImages(actor: AdminUser, productId: string, imageIds: string[]) {
    if (!imageIds?.length) {
      throw new BadRequestException('No image IDs provided.');
    }

    const images = await this.prisma.productImage.findMany({
      where: { productId },
    });

    if (!images.length) {
      throw new NotFoundException('No images found for this product.');
    }

    // Ensure all imageIds belong to this product
    const imageIdSet = new Set(images.map((i) => i.id));
    const invalidIds = imageIds.filter((id) => !imageIdSet.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'One or more images do not belong to this product.',
      );
    }

    // Ensure at least one image remains
    if (images.length - imageIds.length < 1) {
      throw new BadRequestException('Product must retain at least one image.');
    }

    // Extract filenames for Supabase deletion
    const filenames = images
      .filter((i) => imageIds.includes(i.id))
      .map((i) => i.url.split('/').pop())
      .filter((name): name is string => Boolean(name));

    if (filenames.length) {
      await this.uploader.deleteFiles(filenames);
    }

    await this.prisma.productImage.deleteMany({
      where: { id: { in: imageIds } },
    });

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { title_en: true },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.PRODUCT_IMAGES_DELETED,
      entity: 'Product',
      entityId: productId,
      message: `${this.actorLabel(actor)} removed ${imageIds.length} image(s) from product "${product?.title_en ?? 'Unknown'}".`,
    });

    return {
      deleted: imageIds.length,
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

  async reindexAllProducts() {
    const products = await this.prisma.product.findMany({
      include: {
        variants: {
          include: {
            color: true,
            size: true,
          },
        },
        category: true,
      },
    });

    const body = products.flatMap((product) => [
      {
        index: {
          _index: process.env.ELASTICSEARCH_INDEX_PRODUCTS!,
          _id: product.id,
        },
      },
      mapProductToSearchDoc(product),
    ]);

    if (!body.length) return { indexed: 0 };

    const res = await this.es.bulk({ refresh: true, body });

    if (res.errors) {
      console.error('❌ Elasticsearch bulk errors', res.items);
    }

    return { indexed: products.length };
  }
}
