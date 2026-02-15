/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  CancellationSource,
  Currency,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { generateOrderNumber } from './utils/generate-order-number';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto';
import { logActivity } from '../activity/activity-logger.util';
import { generateAddressHash } from 'src/common/utils/address-hash';
import { DEFAULT_SHIPPING_USD, SHIPPING_USD_BY_COUNTRY } from 'src/common';
import { FlutterwaveService } from '../payments/flutterwave.service';
import { EmailService } from '../notifications/email/email.service';
import { EMAIL_TEMPLATE_MAP } from '../notifications/email/email.templates';
import { EmailEvent } from '../notifications/email/email.types';

const LOCKED_SHIPPING_STATUSES: readonly OrderStatus[] = [
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly flutterwaveService: FlutterwaveService,
  ) {}

  /* ======================================================
     CREATE ORDER FROM CART (CHECKOUT) & GET ORDER
  ====================================================== */

  async checkoutFromCart(
    cartId: string,
    dto: CreateOrderDto,
    customerId: string | null,
    deviceId?: string,
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: { include: { images: true } },
            variant: true,
          },
        },
      },
    });

    /* =============================
     CART VALIDATION
  ============================== */
    if (!cart) throw new BadRequestException('Cart not found');
    if (!cart.items.length) throw new BadRequestException('Cart is empty');
    if (cart.status === 'LOCKED') {
      throw new BadRequestException('This cart is already being checked out');
    }

    /**
     * Ownership enforcement:
     * - If authenticated: cart must belong to the customer (or be unassigned and will be claimed elsewhere)
     * - If guest: cart must be guest cart AND deviceId must match
     */
    if (customerId) {
      if (cart.customerId && cart.customerId !== customerId) {
        throw new BadRequestException('Cart does not belong to this customer');
      }
    } else {
      // Guest checkout
      if (cart.customerId) {
        throw new BadRequestException(
          'This cart requires authentication. Please sign in to continue',
        );
      }

      if (!deviceId) {
        throw new BadRequestException(
          'Device ID is required for guest checkout',
        );
      }

      // 🔥 This is the real security check you were missing
      if (!cart.deviceId || cart.deviceId !== deviceId) {
        throw new BadRequestException('Cart does not belong to this device');
      }
    }

    /* =============================
     1. CURRENCY (BACKEND TRUTH)
  ============================== */
    const currency = dto.currency?.toUpperCase() as Currency;
    if (!currency) throw new BadRequestException('Currency is required');

    const rateRecord =
      currency === 'USD'
        ? { currency: 'USD', rate: 1 }
        : await this.prisma.currencyRate.findUnique({ where: { currency } });

    if (!rateRecord) {
      throw new BadRequestException(
        `Unsupported or missing exchange rate for ${currency}`,
      );
    }

    const exchangeRate = rateRecord.rate;

    /* =============================
     2. ORDER NUMBER
  ============================== */
    let orderNumber: string;
    while (true) {
      orderNumber = generateOrderNumber();
      const exists = await this.prisma.order.count({ where: { orderNumber } });
      if (!exists) break;
    }

    /* =============================
     3. SUBTOTAL (USD → LOCAL)
  ============================== */
    const subtotalUSD = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.product.priceUSD,
      0,
    );
    const subtotalLocal = subtotalUSD * exchangeRate;

    /* =============================
     4. SHIPPING (BACKEND-ONLY)
  ============================== */
    let shippingUSD: number;
    switch (dto.shippingCountry) {
      case 'United States':
        shippingUSD = SHIPPING_USD_BY_COUNTRY['United States'];
        break;
      case 'Canada':
        shippingUSD = SHIPPING_USD_BY_COUNTRY['Canada'];
        break;
      case 'United Kingdom':
        shippingUSD = SHIPPING_USD_BY_COUNTRY['United Kingdom'];
        break;
      case 'Nigeria':
        shippingUSD = SHIPPING_USD_BY_COUNTRY['Nigeria'];
        break;
      case 'South Africa':
        shippingUSD = SHIPPING_USD_BY_COUNTRY['South Africa'];
        break;
      default:
        shippingUSD = DEFAULT_SHIPPING_USD;
    }

    const shippingLocal = shippingUSD * exchangeRate;
    const totalLocal = subtotalLocal + shippingLocal;

    /* =============================
     6. TRANSACTION
  ============================== */
    return this.prisma.$transaction(async (tx) => {
      /* -------- SAVE ADDRESS (OPTIONAL) -------- */
      let shippingAddressId: string | undefined;

      if (customerId && dto.saveAddress) {
        const addressHash = generateAddressHash({
          shippingStreet: dto.shippingStreet,
          shippingCity: dto.shippingCity,
          shippingState: dto.shippingState,
          shippingPostal: dto.shippingPostal,
          shippingCountry: dto.shippingCountry,
        });

        const existingCount = await tx.customerAddress.count({
          where: { customerId },
        });

        const address = await tx.customerAddress.upsert({
          where: {
            customerId_addressHash: {
              customerId,
              addressHash,
            },
          },
          create: {
            customerId,
            addressHash,
            fullName: dto.shippingFullName,
            phone: dto.shippingPhone,
            street: dto.shippingStreet,
            city: dto.shippingCity,
            state: dto.shippingState,
            postalCode: dto.shippingPostal,
            country: dto.shippingCountry,
            isDefault: existingCount === 0,
          },
          update: {},
        });

        shippingAddressId = address.id;
      }

      // ✅ FIX: Prisma expects create: [] here
      const timelineEntries = [
        {
          status: OrderStatus.PENDING,
          note: 'Order created',
        },
        ...(dto.customerNote
          ? [
              {
                status: OrderStatus.PENDING,
                note: `Customer note: ${dto.customerNote}`,
                source: 'customer' as const,
              },
            ]
          : []),
      ];

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customerId ?? undefined,
          cartId: cart.id,

          email: dto.email,
          phone: dto.phone,
          customerNote: dto.customerNote ?? null,

          shippingAddressId,
          shippingFullName: dto.shippingFullName,
          shippingPhone: dto.shippingPhone,
          shippingStreet: dto.shippingStreet,
          shippingCity: dto.shippingCity,
          shippingState: dto.shippingState,
          shippingPostal: dto.shippingPostal,
          shippingCountry: dto.shippingCountry,

          currency,

          subtotalAmount: subtotalLocal,
          shippingAmount: shippingLocal,
          totalAmount: totalLocal,
          subtotalAmountUSD: subtotalUSD,
          shippingAmountUSD: shippingUSD,
          totalAmountUSD: subtotalUSD + shippingUSD,
          exchangeRateToUSD: currency === 'USD' ? 1 : exchangeRate,

          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentProvider: 'flutterwave',
          flwStatus: 'pending',

          items: {
            create: cart.items.map((item) => {
              const product = item.product;
              const variant = item.variant;

              const image =
                product.images.find(
                  (img) => img.colorId === variant?.colorId && img.isPrimary,
                ) ||
                product.images.find(
                  (img) => img.colorId === variant?.colorId,
                ) ||
                product.images.find((img) => img.isPrimary) ||
                product.images[0];

              return {
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                priceUSD: item.product.priceUSD,
                priceLocal: item.product.priceUSD * exchangeRate,
                imageUrl: image?.url ?? null,
              };
            }),
          },

          orderTimelines: {
            create: timelineEntries,
          },

          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              message: 'Order created',
            },
          },
        },
      });

      return {
        order,
        pricing: {
          subtotal: subtotalLocal,
          shipping: shippingLocal,
          total: totalLocal,
          currency,
        },
      };
    });
  }

  async adminGetOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: { images: true, variants: { include: { color: true } } },
            },
          },
        },
        orderTimelines: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /* ======================================================
     PUBLIC ORDER TRACKING
  ====================================================== */

  async trackOrder(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                variants: { include: { color: true, size: true } },
              },
            },
            variant: {
              include: {
                color: true,
                size: true,
              },
            },
          },
        },
        orderTimelines: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  /* ======================================================
     ADMIN UPDATE STATUS & SHIPPING
  ====================================================== */

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    adminId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Order not found');

    const prevStatus = order.status;
    const newStatus = dto.status;
    const now = new Date();

    /* ============================================================
     1️⃣ First DB Transaction — update order but do NOT refund yet
  ============================================================ */
    const result = await this.prisma.$transaction(async (tx) => {
      const payload: Partial<typeof order> = {
        status: newStatus,
      };

      // PROCESSING
      if (dto.expectedShipDate) {
        payload.estimatedDelivery = dto.expectedShipDate;
      }

      // SHIPPED
      if (dto.trackingNumber) payload.trackingNumber = dto.trackingNumber;
      if (dto.carrier) payload.carrier = dto.carrier;
      if (dto.estimatedDelivery)
        payload.estimatedDelivery = dto.estimatedDelivery;

      // OUT FOR DELIVERY
      if (dto.outForDeliveryTime)
        payload.outForDeliveryTime = dto.outForDeliveryTime;

      // DELIVERED
      if (dto.deliveredDate)
        payload.deliveredDate = new Date(dto.deliveredDate);

      if (dto.deliveredTime) payload.deliveredTime = dto.deliveredTime;

      // FAILED DELIVERY
      if (dto.failureReason) payload.deliveryFailureReason = dto.failureReason;

      if (dto.nextAttemptDate)
        payload.nextDeliveryAttempt = new Date(dto.nextAttemptDate);

      // DELAYED DELIVERY
      if (dto.delayReason) payload.deliveryDelayReason = dto.delayReason;

      if (dto.newDeliveryDate)
        payload.newDeliveryEstimate = dto.newDeliveryDate;

      /* ============================================================
       REFUND LOGIC — mark in DB only (refund starts later)
    ============================================================ */
      let refundAmount = null;

      if (newStatus === OrderStatus.CANCELLED) {
        refundAmount = dto.refundAmount ?? order.totalAmount;

        payload.cancelledBy = dto.cancelledBy;
        payload.cancellationReason = dto.cancellationReason ?? null;
        payload.cancelledAt = now;

        payload.refundInitiated = true;
        payload.refundAmount = refundAmount;
        payload.refundCurrency = order.currency as any;
        payload.paymentStatus = PaymentStatus.REFUND_INITIATED;

        payload.refundMessage =
          dto.refundMessage ??
          `Your refund of ${order.currency}${refundAmount} will be processed within 5–7 business days.`;
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: payload,
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: newStatus,
          note: dto.note ?? null,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          message: dto.note ?? null,
          createdByAdminId: adminId,
        },
      });

      const admin = await tx.adminUser.findUnique({
        where: { id: adminId },
      });

      if (admin) {
        await logActivity(tx, {
          actor: admin,
          action: ActivityType.ORDER_STATUS_UPDATED,
          entity: 'Order',
          entityId: orderId,
          message: `${admin.name} updated order status ${prevStatus} → ${newStatus}`,
          metadata: payload,
        });
      }

      return {
        email: updatedOrder.email,
        updatedOrder,
        refundAmount,
        flwId: order.flwId,
      };
    });

    /* ============================================================
     2️⃣ After Transaction — safely trigger refund
  ============================================================ */
    if (
      order.paymentStatus === PaymentStatus.REFUNDED ||
      order.refundStatus === 'completed'
    ) {
      return;
    }
    if (
      newStatus === OrderStatus.CANCELLED &&
      order.paymentStatus === PaymentStatus.PAID &&
      result.flwId &&
      result.refundAmount
    ) {
      try {
        const idempotencyKey: string =
          order.refundIdempotencyKey ?? `refund_${order.id}`;

        // Persist idempotency key ONCE
        if (!order.refundIdempotencyKey) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              refundIdempotencyKey: idempotencyKey,
              refundInitiatedAt: new Date(),
              refundStatus: 'initiated',
            },
          });
        }

        await this.flutterwaveService.refund(
          result.flwId,
          result.refundAmount,
          'Order cancellation',
          idempotencyKey,
        );
      } catch (err) {
        console.error('Refund API Error:', err);
      }
    }

    /* ============================================================
     3️⃣ Send cancellation emails AFTER DB commit
  ============================================================ */
    if (newStatus === OrderStatus.CANCELLED) {
      const updatedOrder = result.updatedOrder;

      // CUSTOMER CANCELLED
      if (dto.cancelledBy === CancellationSource.CUSTOMER) {
        await this.emailService.sendTemplate({
          to: updatedOrder.email,
          templateId: EMAIL_TEMPLATE_MAP[EmailEvent.ORDER_CANCELLED_CUSTOMER],
          params: {
            firstName: updatedOrder.shippingFullName.split(' ')[0],
            orderNumber: updatedOrder.orderNumber,
            cancellationDate: new Date().toDateString(),
            currency: updatedOrder.currency,
            total: updatedOrder.totalAmount,
            refundMessage: updatedOrder.refundMessage,
            year: new Date().getFullYear(),
            shopLink: `${process.env.APP_URL}/collections`,
          },
        });
      }

      // ADMIN CANCELLED
      if (dto.cancelledBy === CancellationSource.ADMIN) {
        await this.emailService.sendTemplate({
          to: updatedOrder.email,
          templateId: EMAIL_TEMPLATE_MAP[EmailEvent.ORDER_CANCELLED_ADMIN],
          params: {
            firstName: updatedOrder.shippingFullName.split(' ')[0],
            orderNumber: updatedOrder.orderNumber,
            cancellationDate: new Date().toDateString(),
            cancellationReason: dto.cancellationReason ?? 'Order cancelled',
            currency: updatedOrder.currency,
            total: updatedOrder.totalAmount,
            refundMessage: updatedOrder.refundMessage,
            year: new Date().getFullYear(),
          },
        });
      }
    }

    /* ============================================================
     4️⃣ DELIVERED EMAIL (same as before)
  ============================================================ */
    if (newStatus === OrderStatus.DELIVERED) {
      await this.emailService.sendTemplate({
        to: result.email,
        templateId: EMAIL_TEMPLATE_MAP[EmailEvent.ORDER_DELIVERED],
        params: {
          firstName: result.updatedOrder.shippingFullName.split(' ')[0],
          orderNumber: result.updatedOrder.orderNumber,
          deliveryDate: result.updatedOrder.deliveredDate?.toDateString(),
          deliveryTime: result.updatedOrder.deliveredTime,
          year: new Date().getFullYear(),
          reviewLink: `${process.env.APP_URL}/order/review/${result.updatedOrder.orderNumber}`,
          shopLink: `${process.env.APP_URL}/collections`,
        },
      });
    }

    return { success: true };
  }
  async updateOrderShipping(
    orderId: string,
    dto: UpdateOrderShippingDto,
    adminId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (LOCKED_SHIPPING_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        'Shipping address cannot be modified at this stage.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          shippingFullName: dto.shippingFullName,
          shippingPhone: dto.shippingPhone,
          shippingStreet: dto.shippingStreet,
          shippingCity: dto.shippingCity,
          shippingState: dto.shippingState,
          shippingPostal: dto.shippingPostal,
          shippingCountry: dto.shippingCountry,
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: order.status,
          note: dto.note ?? 'Shipping address updated by admin',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.status,
          message: dto.note ?? 'Admin updated shipping details',
          createdByAdminId: adminId,
        },
      });
      const admin = await tx.adminUser.findUnique({
        where: { id: adminId },
      });

      if (admin) {
        await logActivity(tx, {
          actor: admin,
          action: ActivityType.ORDER_SHIPPING_UPDATED,
          entity: 'Order',
          entityId: orderId,
          message: 'Order shipping address updated',
          metadata: {
            previous: {
              shippingFullName: order.shippingFullName,
              shippingPhone: order.shippingPhone,
              shippingStreet: order.shippingStreet,
              shippingCity: order.shippingCity,
              shippingState: order.shippingState,
              shippingPostal: order.shippingPostal,
              shippingCountry: order.shippingCountry,
            },
            updated: {
              shippingFullName: dto.shippingFullName,
              shippingPhone: dto.shippingPhone,
              shippingStreet: dto.shippingStreet,
              shippingCity: dto.shippingCity,
              shippingState: dto.shippingState,
              shippingPostal: dto.shippingPostal,
              shippingCountry: dto.shippingCountry,
            },
            note: dto.note ?? null,
          },
        });
      }

      return { success: true };
    });
  }
  /* ======================================================
     ADMIN LIST ORDERS
  ====================================================== */

  async adminListOrders(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        items: true,
        orderTimelines: true,
        statusHistory: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async attachOrdersByEmail(
    prisma: PrismaService,
    customerId: string,
    email: string,
  ) {
    await prisma.order.updateMany({
      where: {
        customerId: null,
        email,
        attachedByEmail: false,
      },
      data: {
        customerId,
        attachedByEmail: true,
      },
    });
  }
  async customerListOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
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
        orderTimelines: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async customerGetOrder(
    customerId: string | null,
    deviceId: string | null,
    orderId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        cart: true,
        items: {
          include: {
            product: {
              include: {
                images: true,
                variants: { include: { color: true, size: true } },
              },
            },
            variant: {
              include: {
                color: true,
                size: true,
              },
            },
          },
        },
        orderTimelines: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // If customerId is provided, enforce ownership via customerId
    if (customerId) {
      if (order.customerId !== customerId) {
        throw new BadRequestException(
          'You are not authorized to view this order',
        );
      }
      return order;
    }

    // Otherwise enforce guest ownership via deviceId
    if (!deviceId) {
      throw new BadRequestException(
        'Device ID is required for guest order access',
      );
    }

    const guestOwnsOrder =
      order.customerId === null && order.cart?.deviceId === deviceId;

    if (!guestOwnsOrder) {
      throw new BadRequestException(
        'You are not authorized to view this order',
      );
    }

    return order;
  }
  async customerGetOrderByNumber(orderNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber: orderNumber,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                variants: { include: { color: true, size: true } },
              },
            },
            variant: {
              include: {
                color: true,
                size: true,
              },
            },
          },
        },
        orderTimelines: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
  async customerCancelOrder(
    deviceId: string | null,
    customerId: string | null,
    orderId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { cart: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    const isAuthenticatedCustomer =
      !!customerId && order.customerId === customerId;

    const isGuestCustomer =
      !customerId &&
      order.customerId === null &&
      !!deviceId &&
      order.cart?.deviceId === deviceId;

    if (!isAuthenticatedCustomer && !isGuestCustomer) {
      throw new BadRequestException(
        'You are not authorized to cancel this order',
      );
    }

    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    const now = new Date();
    const refundAmount = order.totalAmount;

    /* ============================================================
     1️⃣ UPDATE DB (inside transaction)
     - Mark as cancelled
     - Mark refund as pending
     - DO NOT call Flutterwave inside the transaction
  ============================================================ */
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledBy: CancellationSource.CUSTOMER,
          cancelledAt: now,
          cancellationReason: 'Cancelled by customer',

          refundInitiated: true,
          refundAmount,
          refundCurrency: order.currency as any,
          paymentStatus: PaymentStatus.REFUND_INITIATED,

          refundMessage: `Your refund of ${order.currency}${refundAmount} is now being processed.`,
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          source: 'customer',
          note: 'Customer cancelled order',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          message: 'Order cancelled by customer',
        },
      });

      return {
        email: updated.email,
        refundAmount,
        flwId: order.flwId,
        currency: order.currency,
        shippingFullName: updated.shippingFullName,
        orderNumber: updated.orderNumber,
      };
    });

    /* ============================================================
     2️⃣ CALL FLUTTERWAVE REFUND AFTER TRANSACTION
     - Safe
     - No rollback issues
  ============================================================ */
    if (
      order.paymentStatus === PaymentStatus.REFUNDED ||
      order.refundStatus === 'completed'
    ) {
      return;
    }
    if (order.paymentStatus === PaymentStatus.PAID && result.flwId) {
      try {
        const idempotencyKey: string =
          order.refundIdempotencyKey ?? `refund_${order.id}`;

        if (!order.refundIdempotencyKey) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              refundIdempotencyKey: idempotencyKey,
              refundInitiatedAt: new Date(),
              refundStatus: 'initiated',
            },
          });
        }

        await this.flutterwaveService.refund(
          result.flwId,
          result.refundAmount,
          'Customer cancellation',
          idempotencyKey,
        );
      } catch (err) {
        console.error('Refund API error:', err);
      }
    }

    /* ============================================================
     3️⃣ SEND EMAIL (safe after commit)
  ============================================================ */
    await this.emailService.sendTemplate({
      to: result.email,
      templateId: EMAIL_TEMPLATE_MAP[EmailEvent.ORDER_CANCELLED_CUSTOMER],
      params: {
        firstName: result.shippingFullName.split(' ')[0],
        orderNumber: result.orderNumber,
        cancellationDate: new Date().toDateString(),
        currency: result.currency,
        total: result.refundAmount,
        refundMessage: `Your refund of ${result.currency}${result.refundAmount} is now being processed.`,
        year: new Date().getFullYear(),
      },
    });

    return { success: true };
  }
}
