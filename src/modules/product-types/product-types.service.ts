import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TranslationService } from '../products/translation.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';

@Injectable()
export class ProductTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translator: TranslationService,
  ) {}

  /* ---------------- ADMIN ---------------- */

  async create(dto: CreateProductTypeDto) {
    // Translate from label_en only (source of truth)
    const translations = await this.translator.translateObject({
      label_en: dto.label_en,
    });

    return this.prisma.productType.create({
      data: {
        key: dto.key,
        label_en: dto.label_en,

        // auto-filled translations
        label_fr: translations.label_fr,
        label_es: translations.label_es,
        label_zu: translations.label_zu,

        isActive: dto.isActive ?? true,
        order: dto.order ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateProductTypeDto) {
    await this.ensureExists(id);

    let translations = {};

    // Only translate when label_en changes
    if (dto.label_en) {
      translations = await this.translator.translateObject({
        label_en: dto.label_en,
      });
    }

    return this.prisma.productType.update({
      where: { id },
      data: {
        ...(dto.label_en && { label_en: dto.label_en }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.order !== undefined && { order: dto.order }),

        // overwrite translated labels only when regenerated
        ...(dto.label_en && translations),
      },
    });
  }

  async delete(id: string) {
    await this.ensureExists(id);

    const usedCount = await this.prisma.product.count({
      where: { productTypeId: id },
    });

    if (usedCount > 0) {
      throw new BadRequestException(
        'Cannot delete product type that is in use. Deactivate it instead.',
      );
    }

    return this.prisma.productType.delete({ where: { id } });
  }

  async listAdmin() {
    return this.prisma.productType.findMany({
      orderBy: { order: 'asc' },
    });
  }

  /* ---------------- PUBLIC ---------------- */

  async listPublic() {
    return this.prisma.productType.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        key: true,
        label_en: true,
        label_fr: true,
        label_es: true,
        label_zu: true,
      },
    });
  }

  /* ---------------- HELPERS ---------------- */

  private async ensureExists(id: string) {
    const exists = await this.prisma.productType.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Product type not found');
    }
  }
}
