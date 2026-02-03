import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { FlutterwaveService } from './flutterwave.service';
import { PaymentsService } from './payments.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../notifications/email/email.service';
import { EMAIL_TEMPLATE_MAP } from '../notifications/email/email.templates';
import { EmailEvent } from '../notifications/email/email.types';

/* ==========================================================
   UNIFIED WEBHOOK BODY INTERFACE
   Supports BOTH Flutterwave v3 and Old Rave format
========================================================== */
interface FlutterwaveWebhookMeta {
  orderId?: string;
  actor?: string;
  [key: string]: unknown;
}

interface FlutterwaveWebhookData {
  id?: number;
  tx_ref?: string;
  txRef?: string;
  status?: string;
  meta?: FlutterwaveWebhookMeta;
  processor_response?: string;
  [key: string]: unknown;
}

interface FlutterwaveWebhookBody {
  // New FW format
  type?: string;

  // Old FW format ("event.type")
  'event.type'?: string;

  // New Format (has "data")
  data?: FlutterwaveWebhookData;

  // Old Format (flat) - these properties exist at root level
  id?: number;
  tx_ref?: string;
  txRef?: string;
  status?: string;
  meta?: FlutterwaveWebhookMeta;
  processor_response?: string;

  [key: string]: unknown;
}

@Controller('webhooks/flutterwave')
export class FlutterwaveWebhookController {
  private readonly logger = new Logger(FlutterwaveWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flw: FlutterwaveService,
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('verif-hash') signature: string | undefined,
  ) {
    /* ==========================================================
       1. VERIFY SIGNATURE
    ========================================================== */
    const secret = this.config.get<string>('FLW_SECRET_HASH')?.trim();
    const incoming = signature?.trim();

    console.log('cleanSignature', incoming);
    console.log('cleanSecret', secret);

    if (!secret || incoming !== secret) {
      this.logger.warn('Invalid Flutterwave webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    /* ==========================================================
       2. READ RAW BODY
    ========================================================== */
    console.log('RAW BODY:', req.body);

    const body = req.body as FlutterwaveWebhookBody;

    // Extract event type
    const eventType =
      body.type ??
      body['event.type'] ?? // Old FW
      null;

    // Extract data (support both formats)
    const data: FlutterwaveWebhookData = body.data ?? body; // old Rave => full body is the data

    this.logger.warn(`FLW Webhook received: ${eventType}`);

    if (!eventType || !data) {
      this.logger.warn('Invalid webhook payload: missing event or data');
      return res.json({ received: true });
    }

    /* ==========================================================
       3. EXTRACT orderId
    ========================================================== */
    const txRef = data.tx_ref ?? data.txRef ?? null;

    const orderId =
      data.meta?.orderId ??
      (txRef && typeof txRef === 'string' && txRef.includes('_')
        ? txRef.split('_')[0]
        : null);

    if (!orderId) {
      this.logger.warn('Webhook missing orderId');
      return res.json({ received: true });
    }

    /* ==========================================================
       4. LOAD ORDER
    ========================================================== */
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                variants: { include: { color: true, size: true } },
                productContentSections: true,
              },
            },
            variant: { include: { color: true, size: true } },
          },
        },
      },
    });

    if (!order) {
      this.logger.warn(`Webhook references unknown order ${orderId}`);
      return res.json({ received: true });
    }

    /* ==========================================================
       5. SUCCESSFUL PAYMENT
    ========================================================== */

    const isSuccessful =
      eventType === 'charge.completed' ||
      data.status === 'successful' ||
      body['event.type'] === 'CARD_TRANSACTION';

    if (isSuccessful) {
      this.logger.log(`Payment SUCCESSFUL for order ${orderId}`);

      if (order.paymentStatus === PaymentStatus.PAID) {
        return res.json({ received: true, status: 'already_processed' });
      }

      // Verify with Flutterwave API
      if (!data.id || typeof data.id !== 'number') {
        this.logger.warn('Missing transaction ID for verification');
        return res.json({ received: true, status: 'missing_transaction_id' });
      }

      const verify = await this.flw.verifyTransaction(data.id);

      if (
        !verify ||
        (verify.status as unknown) !== 'success' ||
        (verify.data?.status as unknown) !== 'successful'
      ) {
        this.logger.warn(`Verification FAILED for transaction ${data.id}`);
        return res.json({ received: true, status: 'verification_failed' });
      }

      /* ======================================================
         Update DB (transactional)
      ====================================================== */
      await this.prisma.$transaction(async (tx) => {
        const receiptUrl = `${process.env.APP_URL}/order/receipt/${order.orderNumber}`;
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
            flwStatus: 'successful',
            flwId: String(data.id),
            paidAt: new Date(),
            receiptUrl,
          },
        });

        await tx.orderTimeline.create({
          data: {
            orderId,
            status: OrderStatus.CONFIRMED,
            source: 'payment',
            note: 'Payment successful. Your order is being processed.',
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: OrderStatus.CONFIRMED,
            message: 'Payment confirmed via Flutterwave webhook',
          },
        });

        if (order.cartId) {
          await tx.cartItem.deleteMany({
            where: { cartId: order.cartId },
          });
          await tx.cart.update({
            where: { id: order.cartId },
            data: { status: 'CLEARED' },
          });
        }
      });

      /* ======================================================
         Save card if actor = logged in customer
      ====================================================== */
      const actorValue = data.meta?.actor;
      const actor = typeof actorValue === 'string' ? actorValue : '';
      const customerId = actor.startsWith('customer:')
        ? actor.split(':')[1]
        : null;

      if (customerId) {
        await this.payments.saveCardFromWebhook(customerId, data);
      }

      /* ======================================================
         SEND CUSTOMER EMAIL — ORDER CONFIRMED
      ====================================================== */
      const firstName =
        order.shippingFullName?.split(' ')[0] ??
        order.email?.split('@')[0] ??
        'there';

      const itemCount = order.items.length;

      /* ==========================================================
   ITEMS HTML
========================================================== */
      const itemsHtml = order.items
        .map((item) => {
          const imageUrl = item.product.images?.[0]?.url ?? null;
          const variant =
            item.variant?.color?.label && item.variant?.size?.label
              ? `${item.variant.color.label} / ${item.variant.size.label}`
              : '';

          return `
      <div class="item">
        ${
          imageUrl
            ? `
          <div class="item-image">
            <img src="${imageUrl}" alt="${item.product.title_en}">
          </div>
        `
            : ''
        }

        <div class="item-details">
          <div class="item-name">${item.product.title_en}</div>
          <div class="item-meta">Quantity: ${item.quantity}</div>

          ${variant ? `<div class="item-meta">${variant}</div>` : ''}
        </div>

        <div class="item-price">
          ${order.currency}${item.priceLocal * item.quantity}
        </div>
      </div>
    `;
        })
        .join('');

      /* ==========================================================
   EMAIL PARAMS
========================================================== */
      const emailParams = {
        firstName: firstName ?? 'there',
        orderNumber: order.orderNumber,
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        estimatedDelivery: '7-10 Business Days',
        year: new Date().getFullYear(),

        currency: order.currency,
        subtotal: order.subtotalAmount,
        shipping: order.shippingAmount,
        total: order.totalAmount,
        itemCount: itemCount,

        shippingName: order.shippingFullName,
        shippingAddress1: order.shippingStreet,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState ?? '',
        shippingPostal: order.shippingPostal ?? '',
        shippingCountry: order.shippingCountry,
        shippingPhone: order.shippingPhone,

        trackingUrl: `${process.env.APP_URL}/order/track/${order.orderNumber}`,

        // Inject full HTML blocks
        itemsHtml: itemsHtml,
      };

      /* ==========================================================
   SEND EMAIL
========================================================== */
      await this.emailService.sendTemplate({
        to: order.email,
        templateId: EMAIL_TEMPLATE_MAP[EmailEvent.ORDER_CONFIRMED_CUSTOMER],
        params: emailParams,
      });

      /* ======================================================
   ADMIN EMAIL
====================================================== */

      const orderDate = new Date(order.createdAt);

      // Build adminItemsHtml (no loops inside template)
      const adminItemsHtml = order.items
        .map((item) => {
          const imageUrl = item.product.images?.[0]?.url ?? null;
          const variant =
            item.variant?.color?.label && item.variant?.size?.label
              ? `${item.variant.color.label} / ${item.variant.size.label}`
              : '';

          return `
      <div class="item">

        ${
          imageUrl
            ? `
          <div class="item-image">
            <img src="${imageUrl}" alt="${item.product.title_en}">
          </div>
        `
            : ''
        }

        <div class="item-details">
          <div class="item-name">${item.product.title_en}</div>
          <div class="item-meta">Qty: ${item.quantity}${variant ? ` • ${variant}` : ''}</div>
        </div>

        <div class="item-price">
          ${order.currency}${item.priceLocal * item.quantity}
        </div>

      </div>
    `;
        })
        .join('');

      const adminParams = {
        orderNumber: order.orderNumber,
        currency: order.currency,
        total: order.totalAmount,
        subtotal: order.subtotalAmount,
        shipping: order.shippingAmount,
        itemCount: order.items.length,

        orderDate: orderDate.toLocaleDateString(),
        orderTime: orderDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),

        // Customer info
        customerName: order.shippingFullName,
        customerEmail: order.email,
        customerPhone: order.phone ?? order.shippingPhone,

        // Shipping
        shippingName: order.shippingFullName,
        shippingAddress1: order.shippingStreet,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState ?? '',
        shippingPostal: order.shippingPostal ?? '',
        shippingCountry: order.shippingCountry,
        shippingPhone: order.shippingPhone,

        // Payment
        paymentMethod: order.paymentProvider ?? 'Flutterwave',
        transactionId: order.flwId ?? '',

        // Items HTML
        adminItemsHtml: adminItemsHtml,
      };

      await this.emailService.sendTemplate({
        to: process.env.ADMIN_SALES_EMAIL ?? 'sales@kbcuniverse.org',
        templateId: EMAIL_TEMPLATE_MAP[EmailEvent.ORDER_CONFIRMED_ADMIN],
        params: adminParams,
      });

      return res.json({ received: true, status: 'processed' });
    }

    /* ==========================================================
       6. FAILED PAYMENT
    ========================================================== */
    const isFailed = eventType === 'charge.failed' || data.status === 'failed';

    if (isFailed) {
      this.logger.warn(`Payment FAILED for order ${orderId}`);

      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            flwStatus: 'failed',
            status: OrderStatus.PAYMENT_FAILED,
          },
        });

        await tx.orderTimeline.create({
          data: {
            orderId,
            status: OrderStatus.PAYMENT_FAILED,
            source: 'payment',
            note: 'Payment failed. Retry any time.',
          },
        });
      });

      return res.json({ received: true, status: 'payment_failed' });
    }

    /* ==========================================================
       7. REFUND EVENT
    ========================================================== */
    const refundEvents = [
      'refund.completed',
      'refund.successful',
      'refund.processed',
      'transaction.refund.completed',
      'card.refund.completed',
    ];

    if (refundEvents.includes(eventType)) {
      this.logger.log(`Refund COMPLETED for order ${orderId}`);

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          refundedAt: new Date(),
          refundInitiated: false,
          paymentStatus: PaymentStatus.REFUNDED,
          status: OrderStatus.CANCELLED,
        },
      });

      const firstName = order.shippingFullName?.split(' ')[0] ?? 'there';

      await this.emailService.sendTemplate({
        to: order.email,
        templateId: EMAIL_TEMPLATE_MAP[EmailEvent.REFUND_COMPLETED],
        params: {
          firstName,
          orderNumber: order.orderNumber,
          amount: order.refundAmount,
          currency: order.currency,
          date: new Date().toDateString(),
          year: new Date().getFullYear(),
        },
      });

      return res.json({ received: true, status: 'refund_completed' });
    }

    /* ==========================================================
       8. UNKNOWN EVENT
    ========================================================== */
    this.logger.warn(`Unhandled Flutterwave Event: ${eventType}`);
    return res.json({ received: true, status: 'ignored' });
  }
}
