import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { TranslationService } from '../products/translation.service';
import { SupabaseUploadService } from '../../common/utils/supabase-upload.service';
import { makeSlug } from '../../common/utils/slugify';
import { ActivityType, AdminUser } from '@prisma/client';
import { logActivity } from '../activity/activity-logger.util';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translator: TranslationService,
    private readonly uploader: SupabaseUploadService,
  ) {}

  /* ======================================================
   * HELPERS
   * ====================================================== */

  private actorLabel(actor: AdminUser) {
    return actor.name ?? actor.email;
  }

  private async ensureUniqueSlug(slug: string) {
    const exists = await this.prisma.category.findUnique({ where: { slug } });
    if (exists) {
      throw new BadRequestException(
        `Category with slug "${slug}" already exists.`,
      );
    }
  }

  /* ======================================================
   * CREATE
   * ====================================================== */

  async create(
    actor: AdminUser,
    dtos: CreateCategoryDto[] | CreateCategoryDto,
    files: Express.Multer.File[],
  ): Promise<any[]> {
    const inputs = Array.isArray(dtos) ? dtos : [dtos];

    if (inputs.length !== files.length) {
      throw new BadRequestException(
        `Each category requires exactly one image.`,
      );
    }

    const created: any[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const dto = inputs[i];
      const file = files[i];

      const slug = makeSlug(dto.name_en);
      await this.ensureUniqueSlug(slug);

      const translations = await this.translator.translateObject({
        name_en: dto.name_en,
        description_en: dto.description_en ?? '',
      });

      const imageUrl = await this.uploader.uploadFile(file);

      const category = await this.prisma.category.create({
        data: {
          slug,
          name_en: dto.name_en,
          description_en: dto.description_en ?? null,
          ...translations,
          imageUrl,
        },
      });

      await logActivity(this.prisma, {
        actor,
        action: ActivityType.CATEGORY_CREATED,
        entity: 'Category',
        entityId: category.id,
        message: `${this.actorLabel(actor)} created category "${category.name_en}".`,
      });

      created.push(category);
    }

    return created;
  }

  /* ======================================================
   * READ
   * ====================================================== */

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { products: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  /* ======================================================
   * UPDATE
   * ====================================================== */

  async update(
    actor: AdminUser,
    id: string,
    dto: UpdateCategoryDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.findOne(id);
    const data: Record<string, any> = {};
    const changes: string[] = [];

    const nameChanged = dto.name_en && dto.name_en !== existing.name_en;

    const descriptionChanged =
      dto.description_en !== undefined &&
      dto.description_en !== existing.description_en;

    if (nameChanged || descriptionChanged) {
      const translations = await this.translator.translateObject({
        name_en: dto.name_en ?? existing.name_en,
        description_en: dto.description_en ?? existing.description_en ?? '',
      });

      if (nameChanged) {
        data.name_en = dto.name_en;
        data.slug = makeSlug(dto.name_en!);
        changes.push('name');
      }

      if (descriptionChanged) {
        data.description_en = dto.description_en ?? null;
        changes.push('description');
      }

      Object.assign(data, translations);
    }

    if (file) {
      data.imageUrl = await this.uploader.uploadFile(file);
      changes.push('image');
    }

    if (!changes.length) {
      return existing;
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data,
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.CATEGORY_UPDATED,
      entity: 'Category',
      entityId: id,
      message: `${this.actorLabel(actor)} updated category "${existing.name_en}" (${changes.join(
        ', ',
      )}).`,
    });

    return updated;
  }

  /* ======================================================
   * DELETE
   * ====================================================== */

  async remove(actor: AdminUser, id: string) {
    const category = await this.findOne(id);

    await this.prisma.category.delete({ where: { id } });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.CATEGORY_DELETED,
      entity: 'Category',
      entityId: id,
      message: `${this.actorLabel(actor)} deleted category "${category.name_en}".`,
    });

    return { deleted: true, id };
  }
}
