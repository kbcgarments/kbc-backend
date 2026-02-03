export class HeroPublicDto {
  id!: string;
  headline!: string;
  subheadline?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  imageUrl!: string;
}
