/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminUser, ActivityType, ProductStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupabaseUploadService } from 'src/common/utils/supabase-upload.service';
import { Client } from '@elastic/elasticsearch';
import { Inject } from '@nestjs/common';
import {
  actorLabel,
  ContentSectionInput,
  ensureProducts,
  ImageMeta,
  syncContentSections,
  VariantInput,
} from '../products.helpers';
import { logActivity } from '../../activity/activity-logger.util';
import { TranslationService } from '../translation.service';
import { mapProductToSearchDoc } from '../../search/search.utils';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsPublicService } from '../public/products.public.service';

@Injectable()
export class ProductsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translator: TranslationService,
    private readonly uploader: SupabaseUploadService,
    private readonly productsPublic: ProductsPublicService,
    @Inject('ELASTICSEARCH_CLIENT')
    private readonly es: Client,
  ) {}

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
        ? (JSON.parse(String(dto.contentSections)) as ContentSectionInput[])
        : undefined;

      await syncContentSections(tx, created.id, contentSections);
      return created;
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.PRODUCT_CREATED,
      entity: 'Product',
      entityId: product.id,
      message: `${actorLabel(actor)} created "${product.title_en}".`,
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

  async update(
    actor: AdminUser,
    id: string,
    dto: UpdateProductDto,
    files?: Express.Multer.File[],
    variantsJson?: string,
    newImageMeta?: string,
  ) {
    const existing = await this.productsPublic.findOne(id);

    const translations =
      dto.title_en || dto.description_en
        ? await this.translator.translateObject({
            title_en: dto.title_en,
            description_en: dto.description_en,
          })
        : {};

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

      if (variantsJson) {
        const incoming = JSON.parse(variantsJson) as VariantInput[];
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
          include: { cartItems: true },
        });

        const existingMap = new Map(
          existingVariants.map((v) => [`${v.colorId}-${v.sizeId}`, v]),
        );

        for (const v of incoming) {
          const key = `${v.colorId ?? null}-${v.sizeId ?? null}`;
          const existing = existingMap.get(key);

          if (existing) {
            await tx.productVariant.update({
              where: { id: existing.id },
              data: { stock: v.stock },
            });
            existingMap.delete(key);
          } else {
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

        for (const leftover of existingMap.values()) {
          if (leftover.cartItems.length === 0) {
            await tx.productVariant.delete({ where: { id: leftover.id } });
          }
        }
      }

      const contentSections = dto.contentSections
        ? (JSON.parse(dto.contentSections) as ContentSectionInput[])
        : undefined;

      await syncContentSections(tx, id, contentSections);
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.PRODUCT_UPDATED,
      entity: 'Product',
      entityId: id,
      message: `${actorLabel(actor)} updated "${existing.title_en}".`,
    });

    const updated = await this.productsPublic.findOne(id);

    await this.es.index({
      index: process.env.ELASTICSEARCH_INDEX_PRODUCTS!,
      id: updated.id,
      document: mapProductToSearchDoc(updated),
    });

    return updated;
  }

  async archiveMany(actor: AdminUser, ids: string[]) {
    const products = await ensureProducts(this.prisma, ids);

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
        message: `${actorLabel(actor)} archived "${p.title_en}".`,
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
    const products = await ensureProducts(this.prisma, idList);

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
        message: `${actorLabel(actor)} permanently deleted "${p.title_en}".`,
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
      message: `${actorLabel(actor)} removed ${imageIds.length} image(s) from product "${product?.title_en ?? 'Unknown'}".`,
    });

    return {
      deleted: imageIds.length,
    };
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
