import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { ProductsPublicService } from './products.public.service';

@ApiTags('Products (Storefront + Admin)')
@Controller('products')
export class ProductsPublicController {
  constructor(private readonly products: ProductsPublicService) {}

  /* ======================================================
     STORE LISTING
  ====================================================== */

  @Get()
  @ApiOperation({ summary: 'Get products (storefront + admin)' })
  @ApiQuery({ name: 'admin', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async listProducts(
    @Query('admin') admin?: 'true' | 'all',
    @Query('status') status?: ProductStatus,
    @Query('limit') limit = '20',
    @Query('offset') offset?: string,
  ) {
    return this.products.listProductsUnified({
      admin,
      status,
      limit: Number(limit),
      offset: offset ? Number(offset) : undefined,
    });
  }

  /* ======================================================
     METADATA
  ====================================================== */

  @Get('/colors')
  @ApiOperation({ summary: 'Get all product colors' })
  getProductColors() {
    return this.products.getProductColors();
  }

  @Get('/sizes')
  @ApiOperation({ summary: 'Get all product sizes' })
  getProductSizes() {
    return this.products.getProductSizes();
  }

  @Get(':id/colors')
  getProductAvailableColors(@Param('id') id: string) {
    return this.products.getProductAvailableColors(id);
  }

  @Get(':id/sizes')
  getProductAvailableSizes(@Param('id') id: string) {
    return this.products.getProductAvailableSizes(id);
  }

  /* ======================================================
     FILTERING
  ====================================================== */

  @Get('filter')
  @ApiOperation({ summary: 'Filter products' })
  async filter(
    @Query('category') category?: string,
    @Query('sizesIds') sizeIds?: string,
    @Query('colorIds') colorIds?: string,
    @Query('productTypeIds') productTypeIds?: string,
    @Query('stock') stock?: 'in' | 'out',
    @Query('sort') sort?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '20',
  ) {
    return this.products.filterProducts({
      category,
      sizeIds,
      colorIds,
      productTypeIds,
      stock,
      sort,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      cursor,
      limit: Number(limit),
    });
  }

  /* ======================================================
     CATEGORY SLUG
  ====================================================== */

  @Get('category/:slug')
  @ApiOperation({ summary: 'Get products by category slug' })
  async byCategory(@Param('slug') slug: string) {
    return this.products.filterProducts({
      category: slug,
      limit: 100,
    });
  }

  /* ======================================================
     SINGLE PRODUCT
  ====================================================== */

  @Get(':id')
  @ApiQuery({ name: 'colorId', required: false })
  async findOne(@Param('id') id: string, @Query('colorId') colorId?: string) {
    return this.products.findOne(id, colorId);
  }
}
