import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  Param,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiConsumes,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AdminUser } from '@prisma/client';

import { CatalogManagerOnly } from '../../admin/decorators/roles.decorator';
import { AdminAuthGuard } from '../../admin/guards/admin-auth.guard';
import { RolesGuard } from '../../admin/guards/roles.guard';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsAdminService } from './products.admin.service';

/* ======================================================
   TYPES
====================================================== */

interface AuthenticatedRequest extends Request {
  user: AdminUser;
}

/* ======================================================
   FILE UPLOAD CONFIG
====================================================== */

const imageUploadInterceptor = FilesInterceptor('images', 20, {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      return cb(new BadRequestException('Only image files allowed'), false);
    }
    cb(null, true);
  },
});

const newImagesUploadInterceptor = FilesInterceptor('newImages', 10, {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@ApiTags('Products (Admin)')
@ApiBearerAuth()
@Controller('products')
@UseGuards(AdminAuthGuard, RolesGuard)
@CatalogManagerOnly()
export class ProductsAdminController {
  constructor(private readonly products: ProductsAdminService) {}

  /* ======================================================
     CREATE
  ====================================================== */

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageUploadInterceptor)
  @ApiOperation({ summary: 'Create product' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('variants') variantsJson: string,
  ) {
    if (!files?.length) {
      throw new BadRequestException('At least one image is required');
    }
    if (!variantsJson) {
      throw new BadRequestException('variants field is required');
    }

    return this.products.create(req.user, dto, files, variantsJson);
  }

  /* ======================================================
     UPDATE
  ====================================================== */

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(newImagesUploadInterceptor)
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Body('variants') variantsJson?: string,
    @Body('newImageMeta') newImageMeta?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.products.update(
      req.user,
      id,
      dto,
      files,
      variantsJson,
      newImageMeta,
    );
  }

  /* ======================================================
     RESTORE
  ====================================================== */

  @Post('restore')
  async restore(@Req() req: AuthenticatedRequest, @Body('ids') ids: string[]) {
    if (!ids?.length) {
      throw new BadRequestException('ids array is required');
    }
    return this.products.restoreMany(req.user, ids);
  }

  @Post('admin/reindex-products')
  reindex() {
    return this.products.reindexAllProducts();
  }

  /* ======================================================
     ARCHIVE
  ====================================================== */

  @Delete('archive')
  async archive(@Req() req: AuthenticatedRequest, @Body('ids') ids: string[]) {
    if (!ids?.length) {
      throw new BadRequestException('ids array is required');
    }
    return this.products.archiveMany(req.user, ids);
  }

  /* ======================================================
     DELETE IMAGES
  ====================================================== */

  @Delete(':id/images')
  async deleteImages(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('imageIds') imageIds: string[],
  ) {
    if (!imageIds?.length) {
      throw new BadRequestException('imageIds array is required');
    }
    return this.products.deleteImages(req.user, id, imageIds);
  }

  /* ======================================================
     HARD DELETE
  ====================================================== */

  @Delete('hard')
  async hardDelete(
    @Req() req: AuthenticatedRequest,
    @Body('ids') ids: string[],
  ) {
    if (!ids?.length) {
      throw new BadRequestException('ids array is required');
    }
    return this.products.hardDelete(req.user, ids);
  }
}
