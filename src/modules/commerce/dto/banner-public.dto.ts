export class BannerPublicDto {
  id!: string;
  title?: string | null;
  description?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  imageUrl!: string;
}
