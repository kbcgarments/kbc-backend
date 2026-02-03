import { Banner, HeroSection, Product, WhyChooseUs } from '@prisma/client';
import { IsArray, IsObject } from 'class-validator';

export class HomepageTestimonialDto {
  id!: string;
  customerName!: string;
  rating!: number | null;

  quote_en!: string;
  quote_fr?: string;
  quote_es?: string;
  quote_zu?: string;

  productTitle_en!: string;
  productTitle_fr?: string;
  productTitle_es?: string;
  productTitle_zu?: string;

  createdAt!: Date;
}
export class HomepageResponseDto {
  @IsObject()
  hero!: HeroSection | null;

  @IsArray()
  banners!: Banner[];

  @IsArray()
  featuredProducts!: Product[];

  @IsArray()
  bestSellers!: Product[];

  @IsArray()
  newArrivals!: Product[];

  @IsArray()
  testimonials!: HomepageTestimonialDto[];

  @IsArray()
  whyChooseUs!: WhyChooseUs[];
}
