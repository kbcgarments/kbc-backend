// src/modules/commerce/commerce.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommerceService } from './commerce.service';
import { OptionalCustomerAuthGuard } from '../auth/guards/optional-customer-auth-guard';

function clampTake(
  value: unknown,
  fallback: number,
  min = 1,
  max = 50,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

@Controller('commerce')
@UseGuards(OptionalCustomerAuthGuard)
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('hero')
  hero() {
    return this.commerce.getHero();
  }

  @Get('banners')
  banners() {
    return this.commerce.getBanners();
  }

  @Get('featured-products')
  featuredProducts(@Query('take') take?: string) {
    return this.commerce.getFeaturedProducts({
      take: clampTake(take, 8, 1, 24),
    });
  }

  @Get('best-sellers')
  bestSellers(@Query('take') take?: string) {
    return this.commerce.getBestSellers({ take: clampTake(take, 8, 1, 24) });
  }

  @Get('new-arrivals')
  newArrivals(@Query('take') take?: string) {
    return this.commerce.getNewArrivals({ take: clampTake(take, 12, 1, 48) });
  }

  @Get('testimonials')
  testimonials(@Query('take') take?: string) {
    return this.commerce.getTestimonials({ take: clampTake(take, 6, 1, 20) });
  }

  @Get('why-choose-us')
  whyChooseUs() {
    return this.commerce.getWhyChooseUs();
  }
}
