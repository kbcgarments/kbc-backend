import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

import { AdminAuthGuard } from '../../modules/admin/guards/admin-auth.guard';
import { RolesGuard } from '../../modules/admin/guards/roles.guard';
import { CatalogManagerOnly } from '../../modules/admin/decorators/roles.decorator';

@Controller('variants')
export class VariantsController {
  constructor(private readonly service: VariantsService) {}

  @Post()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  create(@Body() dto: CreateVariantDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
