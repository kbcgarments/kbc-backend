import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProductContentType, ProductStatus } from '@prisma/client';

/* ======================================================
   CONTENT SECTION DTO
====================================================== */

export class ProductContentSectionDto {
  @ApiProperty({
    enum: ProductContentType,
    example: ProductContentType.DESCRIPTION,
  })
  @IsEnum(ProductContentType)
  type!: ProductContentType;

  @ApiProperty({
    example: 'Made with 100% organic cotton for all-day comfort.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  content_en!: string;
}

/* ======================================================
   CREATE PRODUCT DTO
====================================================== */

export class CreateProductDto {
  /* ---------- PRICING ---------- */

  @ApiProperty({ example: 49.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  priceUSD!: number;

  /* ---------- CORE INFO ---------- */

  @ApiProperty({ example: 'Essential Cotton T-Shirt' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title_en!: string;

  @ApiProperty({
    example:
      'A premium everyday t-shirt crafted with breathable fabric and reinforced stitching for long-lasting wear.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description_en!: string;

  /* ---------- PRODUCT TYPE (FK) ---------- */

  @ApiProperty({
    description: 'Product type ID (foreign key)',
    example: 'a3f9d2b4-8f8a-4e23-9c3b-9b4f3d2c1a77',
  })
  @IsUUID()
  productTypeId!: string;

  /* ---------- CATEGORY ---------- */

  @ApiPropertyOptional({
    description: 'Category ID this product belongs to',
    example: 'b7c2f9b1-2a44-4c91-9b91-6c7c2e1d4f12',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /* ---------- STATUS ---------- */

  @ApiPropertyOptional({
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  /* ---------- IMAGES ---------- */

  @ApiProperty({
    description: 'JSON string describing image metadata',
    example:
      '[{"colorId":"uuid","isPrimary":true},{"colorId":null,"isPrimary":false}]',
  })
  @IsString()
  imageMeta!: string;

  /* ---------- CONTENT SECTIONS ---------- */

  @ApiPropertyOptional({
    description: 'JSON string of product content sections',
    example:
      '[{"type":"DESCRIPTION","content_en":"Detailed product description"}]',
  })
  @IsOptional()
  @IsString()
  contentSections?: string;
}
