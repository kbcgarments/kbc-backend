import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ======================================================
     CREATE VARIANT
  ====================================================== */
  async create(dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    /* ---------- Validate color ---------- */
    if (dto.colorId) {
      const colorExists = await this.prisma.productColor.findUnique({
        where: { id: dto.colorId },
        select: { id: true },
      });

      if (!colorExists) {
        throw new BadRequestException('Invalid color selected.');
      }
    }

    /* ---------- Validate size ---------- */
    if (dto.sizeId) {
      const sizeExists = await this.prisma.productSize.findUnique({
        where: { id: dto.sizeId },
        select: { id: true },
      });

      if (!sizeExists) {
        throw new BadRequestException('Invalid size selected.');
      }
    }

    /* ---------- Prevent duplicate variants ---------- */
    const duplicate = await this.prisma.productVariant.findFirst({
      where: {
        productId: dto.productId,
        colorId: dto.colorId ?? null,
        sizeId: dto.sizeId ?? null,
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        'A variant with this color and size already exists.',
      );
    }

    return this.prisma.productVariant.create({
      data: {
        productId: dto.productId,
        colorId: dto.colorId ?? null,
        sizeId: dto.sizeId ?? null,
        stock: dto.stock,
      },
      include: {
        color: true,
        size: true,
      },
    });
  }

  /* ======================================================
     UPDATE VARIANT
  ====================================================== */
  async update(id: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found.');
    }

    /* ---------- Validate color ---------- */
    if (dto.colorId) {
      const colorExists = await this.prisma.productColor.findUnique({
        where: { id: dto.colorId },
        select: { id: true },
      });

      if (!colorExists) {
        throw new BadRequestException('Invalid color selected.');
      }
    }

    /* ---------- Validate size ---------- */
    if (dto.sizeId) {
      const sizeExists = await this.prisma.productSize?.findUnique({
        where: { id: dto.sizeId },
        select: { id: true },
      });

      if (!sizeExists) {
        throw new BadRequestException('Invalid size selected.');
      }
    }

    /* ---------- Prevent conflicts ---------- */
    if (dto.colorId !== undefined || dto.sizeId !== undefined) {
      const conflict = await this.prisma.productVariant.findFirst({
        where: {
          productId: variant.productId,
          colorId: dto.colorId ?? variant.colorId,
          sizeId: dto.sizeId ?? variant.sizeId,
          NOT: { id },
        },
      });

      if (conflict) {
        throw new BadRequestException(
          'Another variant with the same color and size already exists.',
        );
      }
    }

    return this.prisma.productVariant.update({
      where: { id },
      data: {
        ...(dto.colorId !== undefined && { colorId: dto.colorId }),
        ...(dto.sizeId !== undefined && { sizeId: dto.sizeId }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
      },
      include: {
        color: true,
        size: true,
      },
    });
  }

  /* ======================================================
     DELETE VARIANT
  ====================================================== */
  async delete(id: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          include: { variants: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found.');
    }

    if (variant.product.variants.length === 1) {
      throw new BadRequestException(
        'A product must have at least one variant.',
      );
    }

    return this.prisma.productVariant.delete({
      where: { id },
    });
  }
}
