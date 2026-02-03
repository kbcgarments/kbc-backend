import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import {
  endOfCurrentMonthUTC,
  startOfCurrentMonthUTC,
} from 'src/common/utils/date';

@Injectable()
export class CustomerDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerDashboardMetrics(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const monthStart = startOfCurrentMonthUTC();
    const monthEnd = endOfCurrentMonthUTC();

    const [
      totalOrders,
      activeOrders,
      deliveredOrders,
      monthlyOrders,
      totalSpent,
      addressCount,
      savedPaymentMethodCount,
      recentOrders,
    ] = await this.prisma.$transaction([
      // Total orders
      this.prisma.order.count({ where: { customerId } }),

      // Active orders
      this.prisma.order.count({
        where: {
          customerId,
          status: {
            notIn: [
              OrderStatus.DELIVERED,
              OrderStatus.CANCELLED,
              OrderStatus.PAYMENT_FAILED,
            ],
          },
        },
      }),

      // Delivered orders
      this.prisma.order.count({
        where: {
          customerId,
          status: OrderStatus.DELIVERED,
        },
      }),

      // Orders this month
      this.prisma.order.count({
        where: {
          customerId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),

      // Total spent (USD only, PAID)
      this.prisma.order.aggregate({
        _sum: { totalAmountUSD: true },
        where: {
          customerId,
          paymentStatus: PaymentStatus.PAID,
        },
      }),

      // Saved addresses
      this.prisma.customerAddress.count({
        where: { customerId },
      }),

      // Saved Flutterwave payment methods
      this.prisma.customerPaymentMethod.count({
        where: { customerId },
      }),

      // 5 most recent orders
      this.prisma.order.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          totalAmountUSD: true,
          createdAt: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title_en: true,
                  images: { take: 1 },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      totalOrders,
      activeOrders,
      deliveredOrders,
      ordersThisMonth: monthlyOrders,
      totalSpentUSD: Number(totalSpent._sum.totalAmountUSD ?? 0),
      savedAddresses: addressCount,
      savedPaymentMethods: savedPaymentMethodCount,
      recentOrders,
    };
  }
}
