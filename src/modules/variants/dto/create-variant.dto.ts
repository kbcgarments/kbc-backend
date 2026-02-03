import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @ApiProperty({ description: 'Product ID the variant belongs to' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  sizeId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock!: number;
}
