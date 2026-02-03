import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ProductTypesService } from './product-types.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { CatalogManagerOnly } from 'src/modules/admin/decorators/roles.decorator';
import { AdminAuthGuard } from 'src/modules/admin/guards/admin-auth.guard';
import { RolesGuard } from 'src/modules/admin/guards/roles.guard';

@ApiTags('Product Types')
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly service: ProductTypesService) {}

  /* ---------- PUBLIC ---------- */

  @Get()
  @ApiOperation({ summary: 'Get active product types (storefront)' })
  getPublic() {
    return this.service.listPublic();
  }

  /* ---------- ADMIN ---------- */

  @Post()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product type' })
  create(@Body() dto: CreateProductTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product type' })
  update(@Param('id') id: string, @Body() dto: UpdateProductTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product type' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get('admin/all')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all product types (admin)' })
  listAdmin() {
    return this.service.listAdmin();
  }
}
