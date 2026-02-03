import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProductTypeDto {
  @ApiProperty({ example: 'tshirt' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  key!: string;

  @ApiProperty({ example: 'T-Shirt' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  label_en!: string;

  @IsOptional()
  @IsString()
  label_fr?: string;

  @IsOptional()
  @IsString()
  label_es?: string;

  @IsOptional()
  @IsString()
  label_zu?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
