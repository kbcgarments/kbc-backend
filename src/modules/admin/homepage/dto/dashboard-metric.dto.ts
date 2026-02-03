import { IsNumber } from 'class-validator';

export class DashboardMetricsDto {
  /* =====================================================
     PRODUCT & CATEGORY METRICS
  ===================================================== */
  @IsNumber()
  totalProducts!: number;

  @IsNumber()
  totalCategories!: number;

  /* =====================================================
     ORDER METRICS
  ===================================================== */
  @IsNumber()
  totalOrders!: number;

  @IsNumber()
  ordersToday!: number;

  @IsNumber()
  pendingOrders!: number;

  @IsNumber()
  deliveredOrders!: number;

  @IsNumber()
  cancelledOrders!: number;

  /* =====================================================
     CUSTOMER METRICS
  ===================================================== */
  @IsNumber()
  totalCustomers!: number;

  /* =====================================================
     REVENUE METRICS
  ===================================================== */
  @IsNumber()
  totalRevenueUSD!: number;

  @IsNumber()
  revenueTodayUSD!: number;

  @IsNumber()
  revenueThisWeekUSD!: number;

  @IsNumber()
  revenueThisMonthUSD!: number;

  /* =====================================================
     FEEDBACK METRICS
  ===================================================== */
  @IsNumber()
  pendingFeedback!: number;

  @IsNumber()
  approvedFeedback!: number;

  @IsNumber()
  promotedFeedback!: number;

  /* =====================================================
     TESTIMONIAL METRICS
  ===================================================== */
  @IsNumber()
  totalTestimonials!: number;

  @IsNumber()
  activeTestimonials!: number;

  /* =====================================================
     HOMEPAGE CONTENT METRICS
  ===================================================== */
  @IsNumber()
  activeHeroSections!: number;

  @IsNumber()
  activeBanners!: number;

  @IsNumber()
  activeWhyChooseUsItems!: number;
}
