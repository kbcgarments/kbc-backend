import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateBannerDto {
  /* ── Title ─────────────────────────── */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title_en?: string;

  /* ── Description ───────────────────── */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description_en?: string;

  /* ── CTA ───────────────────────────── */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  ctaText_en?: string;

  @IsOptional()
  @IsUrl()
  ctaLink?: string;
}
export class UpdateBannerDto extends CreateBannerDto {}
