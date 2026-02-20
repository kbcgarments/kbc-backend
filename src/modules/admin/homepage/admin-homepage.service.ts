import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminUser,
  ActivityType,
  FeedbackStatus,
  OrderStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupabaseUploadService } from 'src/common/utils/supabase-upload.service';
import { logActivity } from 'src/modules/activity/activity-logger.util';
import { TranslationService } from 'src/modules/products/translation.service';

import { CreateHeroDto, UpdateHeroDto } from './dto/hero.dto';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import {
  CreateWhyChooseUsDto,
  UpdateWhyChooseUsDto,
} from './dto/why-choose-us.dto';
import { ReviewFeedbackDto, PromoteTestimonialDto } from './dto/feedback.dto';
import {
  startOfTodayUTC,
  endOfTodayUTC,
  startOfCurrentMonthUTC,
  endOfCurrentMonthUTC,
} from 'src/common/utils/date';
import { DashboardMetricsDto } from './dto/dashboard-metric.dto';
import { CreateCustomerFeedbackDto } from './dto/create-customer-feedback.dto';

@Injectable()
export class AdminHomepageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly upload: SupabaseUploadService,
    private readonly translator: TranslationService,
  ) {}

  /* ======================================================
     HELPERS
  ====================================================== */

  private actorLabel(actor: AdminUser) {
    return actor.name || actor.email || actor.id;
  }

  /* ======================================================
     HERO CRUD
  ====================================================== */

  async createHero(
    actor: AdminUser,
    dto: CreateHeroDto,
    image: Express.Multer.File,
  ) {
    const imageUrl = await this.upload.uploadFile(image);

    await this.prisma.heroSection.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const translations = await this.translator.translateObject({
      headline_en: dto.headline_en,
      subheadline_en: dto.subheadline_en,
      ctaText_en: dto.ctaText_en,
    });

    const hero = await this.prisma.heroSection.create({
      data: {
        ...dto,
        ...translations,
        imageUrl,
        isActive: true,
      },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.HERO_UPDATED,
      entity: 'HeroSection',
      entityId: hero.id,
      message: `${this.actorLabel(actor)} created a hero section`,
    });

    return hero;
  }

  async updateHero(
    actor: AdminUser,
    id: string,
    dto: UpdateHeroDto,
    image?: Express.Multer.File,
  ) {
    const hero = await this.prisma.heroSection.findUnique({ where: { id } });
    if (!hero) throw new NotFoundException('Hero not found');

    const imageUrl = image
      ? await this.upload.uploadFile(image)
      : hero.imageUrl;

    const translations = await this.translator.translateObject({
      headline_en: dto.headline_en,
      subheadline_en: dto.subheadline_en,
      ctaText_en: dto.ctaText_en,
    });
    const updated = await this.prisma.heroSection.update({
      where: { id },
      data: {
        ...dto,
        ...translations,
        imageUrl,
      },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.HERO_UPDATED,
      entity: 'HeroSection',
      entityId: id,
      message: `${this.actorLabel(actor)} updated hero section`,
    });

    return updated;
  }

  async deleteHero(actor: AdminUser, id: string) {
    await this.prisma.heroSection.delete({ where: { id } });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.HERO_UPDATED,
      entity: 'HeroSection',
      entityId: id,
      message: `${this.actorLabel(actor)} deleted hero section`,
    });
  }

  async listHeroes() {
    return this.prisma.heroSection.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ======================================================
     BANNER CRUD
  ====================================================== */

  async createBanner(
    actor: AdminUser,
    dto: CreateBannerDto,
    image: Express.Multer.File,
  ) {
    const imageUrl = await this.upload.uploadFile(image);
    const translations = await this.translator.translateObject({
      title_en: dto.title_en,
      description_en: dto.description_en,
      ctaText_en: dto.ctaText_en,
    });
    const banner = await this.prisma.banner.create({
      data: {
        ...dto,
        ...translations,
        imageUrl,
      },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.BANNER_UPDATED,
      entity: 'Banner',
      entityId: banner.id,
      message: `${this.actorLabel(actor)} created a banner`,
    });

    return banner;
  }

  async updateBanner(
    actor: AdminUser,
    id: string,
    dto: UpdateBannerDto,
    image?: Express.Multer.File,
  ) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    const translations = await this.translator.translateObject({
      title_en: dto.title_en,
      description_en: dto.description_en,
      ctaText_en: dto.ctaText_en,
    });
    const imageUrl = image
      ? await this.upload.uploadFile(image)
      : banner.imageUrl;

    const updated = await this.prisma.banner.update({
      where: { id },
      data: {
        ...dto,
        ...translations,
        imageUrl,
      },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.BANNER_UPDATED,
      entity: 'Banner',
      entityId: id,
      message: `${this.actorLabel(actor)} updated a banner`,
    });

    return updated;
  }

  async deleteBanner(actor: AdminUser, id: string) {
    await this.prisma.banner.delete({ where: { id } });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.BANNER_UPDATED,
      entity: 'Banner',
      entityId: id,
      message: `${this.actorLabel(actor)} deleted a banner`,
    });
  }

  async listBanners() {
    return this.prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ======================================================
     WHY CHOOSE US CRUD
  ====================================================== */

  async createWhyChooseUs(actor: AdminUser, dto: CreateWhyChooseUsDto) {
    const translations = await this.translator.translateObject({
      title_en: dto.title_en,
      description_en: dto.description_en,
    });
    const item = await this.prisma.whyChooseUs.create({
      data: {
        ...dto,
        ...translations,
        icon: dto.icon,
        order: dto.order ?? 0,
        isActive: true,
      },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.WHY_CHOOSE_US_UPDATED,
      entity: 'WhyChooseUs',
      entityId: item.id,
      message: `${this.actorLabel(actor)} created a Why Choose Us item`,
    });

    return item;
  }

  async updateWhyChooseUs(
    actor: AdminUser,
    id: string,
    dto: UpdateWhyChooseUsDto,
  ) {
    const item = await this.prisma.whyChooseUs.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('WhyChooseUs item not found');
    const translations = await this.translator.translateObject({
      title_en: dto.title_en,
      description_en: dto.description_en,
    });
    const updated = await this.prisma.whyChooseUs.update({
      where: { id },
      data: {
        ...dto,
        ...translations,
      },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.WHY_CHOOSE_US_UPDATED,
      entity: 'WhyChooseUs',
      entityId: id,
      message: `${this.actorLabel(actor)} updated Why Choose Us item`,
    });

    return updated;
  }

  async deleteWhyChooseUs(actor: AdminUser, id: string) {
    await this.prisma.whyChooseUs.delete({ where: { id } });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.WHY_CHOOSE_US_UPDATED,
      entity: 'WhyChooseUs',
      entityId: id,
      message: `${this.actorLabel(actor)} deleted Why Choose Us item`,
    });
  }

  async listWhyChooseUs() {
    return this.prisma.whyChooseUs.findMany({
      orderBy: { order: 'asc' },
    });
  }

  /* ======================================================
     CUSTOMER FEEDBACK + TESTIMONIALS
  ====================================================== */
  /* ======================================================
   CUSTOMER FEEDBACK 
====================================================== */

  async submitCustomerFeedback(
    customerId: string | null,
    dto: CreateCustomerFeedbackDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: dto.orderNumber },
      include: { customerFeedbacks: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    // CASE 1: Logged-in customer
    if (order.customerId) {
      if (order.customerId !== customerId) {
        throw new BadRequestException('This order does not belong to you');
      }
    }

    // CASE 2: Guest order — validate via email
    if (!order.customerId) {
      if (order.email.toLowerCase() !== dto.email.toLowerCase()) {
        throw new BadRequestException(
          'Email does not match the order. Unable to verify ownership.',
        );
      }
    }

    // Prevent duplicate feedback
    if (order.customerFeedbacks.length > 0) {
      throw new BadRequestException(
        'Feedback already submitted for this order',
      );
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Order must be delivered before submitting feedback',
      );
    }

    return this.prisma.customerFeedback.create({
      data: {
        orderId: order.id,
        customerId: customerId,
        language: dto.language,
        rating: dto.rating,
        message: dto.message,
      },
    });
  }

  /* ======================================================
     ADMIN — LIST FEEDBACK
  ====================================================== */
  async listCustomerFeedback() {
    return await this.prisma.customerFeedback.findMany({
      include: { order: true, reviewedByAdmin: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ======================================================
     ADMIN — REVIEW FEEDBACK (APPROVE / REJECT)
  ====================================================== */
  async reviewFeedback(
    actor: AdminUser,
    feedbackId: string,
    dto: ReviewFeedbackDto,
  ) {
    const fb = await this.prisma.customerFeedback.findUnique({
      where: { id: feedbackId },
    });

    if (!fb) throw new NotFoundException('Feedback not found');

    const updated = await this.prisma.customerFeedback.update({
      where: { id: feedbackId },
      data: {
        status: dto.status,
        reviewedAt: new Date(),
        reviewedByAdminId: actor.id,
      },
    });

    await logActivity(this.prisma, {
      actor,
      action:
        dto.status === FeedbackStatus.APPROVED
          ? ActivityType.FEEDBACK_APPROVED
          : ActivityType.FEEDBACK_REJECTED,
      entity: 'CustomerFeedback',
      entityId: feedbackId,
      message: `${this.actorLabel(actor)} ${dto.status.toLowerCase()} feedback`,
    });

    return updated;
  }

  /* ======================================================
     ADMIN — PROMOTE FEEDBACK TO TESTIMONIAL
  ====================================================== */
  async promoteFeedbackToTestimonial(
    actor: AdminUser,
    dto: PromoteTestimonialDto,
  ) {
    const fb = await this.prisma.customerFeedback.findUnique({
      where: { id: dto.feedbackId },
      include: {
        order: {
          include: {
            items: {
              include: { product: true }, // <-- we fetch product here!
            },
          },
        },
      },
    });

    if (!fb) throw new NotFoundException('Feedback not found');
    if (fb.status !== FeedbackStatus.APPROVED)
      throw new BadRequestException('Feedback must be approved first');

    // 🟢 SAFETY: order should always have at least one item
    const firstItem = fb.order.items[0];
    if (!firstItem) {
      throw new BadRequestException('This order has no items to reference');
    }

    const product = firstItem.product;

    // 🟢 Create testimonial with localized product titles
    const testimonial = await this.prisma.testimonial.create({
      data: {
        feedbackId: fb.id,
        customerName: dto.customerName ?? fb.order.shippingFullName,

        quote_en: fb.message,
        quote_fr: await this.translator.translate(fb.message, 'French'),
        quote_es: await this.translator.translate(fb.message, 'Spanish'),
        quote_zu: await this.translator.translate(fb.message, 'Zulu'),
        rating: fb.rating,

        // NEW product title fields
        productTitle_en: product.title_en,
        productTitle_fr: await this.translator.translate(
          product.title_en,
          'French',
        ),
        productTitle_es: await this.translator.translate(
          product.title_en,
          'Spanish',
        ),
        productTitle_zu: await this.translator.translate(
          product.title_en,
          'Zulu',
        ),
      },
    });

    // 🟢 Mark feedback as promoted
    await this.prisma.customerFeedback.update({
      where: { id: fb.id },
      data: { status: FeedbackStatus.PROMOTED },
    });

    // 🟢 Log activity
    await logActivity(this.prisma, {
      actor,
      action: ActivityType.FEEDBACK_PROMOTED_TO_TESTIMONIAL,
      entity: 'Testimonial',
      entityId: testimonial.id,
      message: `${this.actorLabel(actor)} promoted feedback to testimonial`,
    });

    return testimonial;
  }

  async toggleTestimonial(actor: AdminUser, id: string, isActive: boolean) {
    const updated = await this.prisma.testimonial.update({
      where: { id },
      data: { isActive },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.TESTIMONIAL_UPDATED,
      entity: 'Testimonial',
      entityId: id,
      message: `${this.actorLabel(actor)} ${
        isActive ? 'activated' : 'deactivated'
      } testimonial`,
    });

    return updated;
  }

  async listTestimonials() {
    return this.prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboardMetrics(): Promise<DashboardMetricsDto> {
    const todayStart = startOfTodayUTC();
    const todayEnd = endOfTodayUTC();

    const monthStart = startOfCurrentMonthUTC();
    const monthEnd = endOfCurrentMonthUTC();

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date();

    const [
      totalProducts,
      totalCategories,

      totalOrders,
      ordersToday,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,

      totalCustomers,

      totalRevenueAgg,
      revenueTodayAgg,
      revenueThisWeekAgg,
      revenueThisMonthAgg,

      pendingFeedback,
      approvedFeedback,
      promotedFeedback,

      totalTestimonials,
      activeTestimonials,

      activeHeroSections,
      activeBanners,
      activeWhyChooseUsItems,
    ] = await this.prisma.$transaction([
      // PRODUCT COUNT
      this.prisma.product.count(),

      // CATEGORY COUNT
      this.prisma.category.count(),

      // ORDER COUNTS
      this.prisma.order.count(),
      this.prisma.order.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),

      // CUSTOMERS
      this.prisma.customer.count(),

      // REVENUE
      this.prisma.order.aggregate({ _sum: { totalAmountUSD: true } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { totalAmountUSD: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: weekStart, lte: weekEnd } },
        _sum: { totalAmountUSD: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { totalAmountUSD: true },
      }),

      // FEEDBACK
      this.prisma.customerFeedback.count({
        where: { status: FeedbackStatus.PENDING },
      }),
      this.prisma.customerFeedback.count({
        where: { status: FeedbackStatus.APPROVED },
      }),
      this.prisma.customerFeedback.count({
        where: { status: FeedbackStatus.PROMOTED },
      }),

      // TESTIMONIALS
      this.prisma.testimonial.count(),
      this.prisma.testimonial.count({ where: { isActive: true } }),

      // HOMEPAGE CONTENT
      this.prisma.heroSection.count({ where: { isActive: true } }),
      this.prisma.banner.count(),
      this.prisma.whyChooseUs.count({ where: { isActive: true } }),
    ]);

    return {
      totalProducts,
      totalCategories,

      totalOrders,
      ordersToday,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,

      totalCustomers,

      totalRevenueUSD: totalRevenueAgg._sum.totalAmountUSD ?? 0,
      revenueTodayUSD: revenueTodayAgg._sum.totalAmountUSD ?? 0,
      revenueThisWeekUSD: revenueThisWeekAgg._sum.totalAmountUSD ?? 0,
      revenueThisMonthUSD: revenueThisMonthAgg._sum.totalAmountUSD ?? 0,

      pendingFeedback,
      approvedFeedback,
      promotedFeedback,

      totalTestimonials,
      activeTestimonials,

      activeHeroSections,
      activeBanners,
      activeWhyChooseUsItems,
    };
  }
}
