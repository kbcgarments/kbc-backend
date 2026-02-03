import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateWhyChooseUsDto {
  @IsString()
  title_en!: string;

  @IsString()
  description_en!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateWhyChooseUsDto extends PartialType(CreateWhyChooseUsDto) {}
