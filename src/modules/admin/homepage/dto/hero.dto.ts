import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateHeroDto {
  @IsString()
  headline_en!: string;

  @IsOptional()
  @IsString()
  subheadline_en?: string;

  @IsOptional()
  @IsString()
  ctaText_en?: string;

  @IsOptional()
  @IsUrl()
  ctaLink?: string;
}

export class UpdateHeroDto {
  @IsOptional()
  @IsString()
  headline_en?: string;

  @IsOptional()
  @IsString()
  subheadline_en?: string;

  @IsOptional()
  @IsString()
  ctaText_en?: string;

  @IsOptional()
  @IsUrl()
  ctaLink?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
