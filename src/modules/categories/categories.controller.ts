import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Req,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AdminUser } from '@prisma/client';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CatalogManagerOnly } from '../admin/decorators/roles.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';

// Extend Express Request to include authenticated admin user
interface AuthenticatedRequest extends Request {
  user: AdminUser;
}

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  /* ======================================================
   * CREATE CATEGORY (SINGLE OR MULTIPLE)
   * ====================================================== */
  @Post()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiOperation({
    summary: 'Create one or multiple categories',
    description:
      'Each category requires exactly one image. Supports batch creation.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fields: {
          type: 'string',
          description: 'JSON string of category data (single object or array)',
          example:
            '[{"name_en":"Men","description_en":"Men\'s clothing"},{"name_en":"Women","description_en":"Women\'s clothing"}]',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'One image per category (order must match fields array)',
        },
      },
      required: ['fields', 'images'],
    },
  })
  @ApiResponse({ status: 201, description: 'Categories created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or image count mismatch',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Catalog manager access required',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('fields') fields: string,
  ) {
    if (!fields) {
      throw new BadRequestException('fields parameter is required');
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    let categories: CreateCategoryDto | CreateCategoryDto[];
    try {
      categories = JSON.parse(fields) as
        | CreateCategoryDto
        | CreateCategoryDto[];
    } catch (error: any) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid JSON in fields parameter';
      throw new BadRequestException(message);
    }

    return this.service.create(req.user, categories, files);
  }

  /* ======================================================
   * GET ALL CATEGORIES (PUBLIC)
   * ====================================================== */
  @Get()
  @ApiOperation({
    summary: 'Get all categories',
    description:
      'Returns all categories ordered by creation date (newest first)',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  findAll() {
    return this.service.findAll();
  }

  /* ======================================================
   * GET BY SLUG - MUST BE BEFORE /:id
   * ====================================================== */
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get category by slug',
    description: 'Retrieve a category and its products by URL-friendly slug',
  })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  /* ======================================================
   * GET BY ID
   * ====================================================== */
  @Get(':id')
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Retrieve a category and its products by UUID',
  })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /* ======================================================
   * UPDATE CATEGORY
   * ====================================================== */
  @Patch(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Update category',
    description: 'Update category details and optionally replace the image',
  })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(req.user, id, dto, file);
  }

  /* ======================================================
   * DELETE CATEGORY
   * ====================================================== */
  @Delete(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete category',
    description: 'Permanently delete a category (hard delete)',
  })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }
}
