/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { FlutterwaveService } from './flutterwave.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flw: FlutterwaveService,
  ) {}

  /* ======================================================
     1. START INLINE PAYMENT (Flutterwave Popup)
  ====================================================== */
  async initiateInlinePayment(params: {
    orderId: string;
    customerId?: string;
    deviceId?: string;
  }) {
    const { orderId, customerId, deviceId } = params;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID)
      throw new BadRequestException('Order already paid');

    const txRef = `${order.id}_${Date.now()}`;

    const paymentConfig = this.flw.buildInlineConfig({
      tx_ref: txRef,
      amount: order.totalAmount,
      currency: order.currency,
      customer: {
        email: order.email,
        name: order.shippingFullName,
        phone_number: order.shippingPhone ?? undefined,
      },
      meta: {
        orderId: order.id,
        actor: customerId ? `customer:${customerId}` : `guest:${deviceId}`,
      },
      customizations: {
        title: 'Order Payment',
        description: `Payment for order ${order.orderNumber}`,
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        txRef,
        flwStatus: 'initiated',
        paymentStatus: PaymentStatus.PENDING,
        paymentProvider: 'flutterwave',
      },
    });

    return { paymentConfig };
  }

  /* ======================================================
     2. CHARGE SAVED CARD (Tokenized)
  ====================================================== */
  async chargeSavedCard(params: {
    orderId: string;
    customerId: string;
    paymentMethodId: string;
  }) {
    const { orderId, customerId, paymentMethodId } = params;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId)
      throw new BadRequestException('Order does not belong to customer');

    if (order.paymentStatus === PaymentStatus.PAID)
      throw new BadRequestException('Order already paid');

    const method = await this.prisma.customerPaymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!method?.token)
      throw new BadRequestException('Saved card token missing');

    const txRef = `${order.id}_token_${Date.now()}`;

    const charge = await this.flw.chargeSavedCard({
      token: method.token,
      amount: order.totalAmount,
      currency: order.currency,
      email: order.email,
      tx_ref: txRef,
    });

    if (charge.status !== 'success') {
      await this.markOrderFailed(orderId);
      throw new BadRequestException(
        charge.message ?? 'Saved card payment failed',
      );
    }

    const verify = await this.flw.verifyTransaction(
      charge?.data?.id as string | number,
    );

    if (verify?.data?.status !== 'successful') {
      await this.markOrderFailed(orderId);
      throw new BadRequestException('Payment verification failed');
    }

    await this.markOrderPaid(orderId, verify);
    return { success: true };
  }

  /* ======================================================
     3. RETRY PAYMENT
  ====================================================== */
  async retryPayment(params: {
    orderId: string;
    customerId?: string;
    paymentMethodId?: string;
    deviceId?: string;
  }) {
    const { orderId, customerId, paymentMethodId, deviceId } = params;

    if (paymentMethodId && !customerId)
      throw new BadRequestException(
        'You must be logged in to use a saved payment method.',
      );

    if (paymentMethodId) {
      return this.chargeSavedCard({
        orderId,
        customerId: customerId!,
        paymentMethodId,
      });
    }

    return this.initiateInlinePayment({ orderId, customerId, deviceId });
  }

  /* ======================================================
     4. SAVE CARD FROM WEBHOOK
  ====================================================== */
  async saveCardFromWebhook(customerId: string, flwEventData: any) {
    const card = this.flw.extractCardDetails(flwEventData);
    if (!card) return;

    const isFirstCard =
      (await this.prisma.customerPaymentMethod.count({
        where: { customerId },
      })) === 0;

    await this.prisma.customerPaymentMethod.upsert({
      where: {
        customerId_providerRef: {
          customerId,
          providerRef: flwEventData.id.toString(),
        },
      },
      create: {
        customerId,
        provider: 'flutterwave',
        providerRef: flwEventData.id.toString(),
        token: card.token,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
        isDefault: isFirstCard,
      },
      update: {
        token: card.token,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
      },
    });
  }

  /* ======================================================
     5. ORDER STATUS UPDATES
  ====================================================== */
  private async markOrderPaid(orderId: string, flwVerify: any) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.paymentStatus === PaymentStatus.PAID) return;

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          flwId: flwVerify.data.id.toString(),
          flwStatus: 'successful',
          paidAt: new Date(),
          status: OrderStatus.CONFIRMED,
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: OrderStatus.CONFIRMED,
          source: 'payment',
          note: 'Payment confirmed',
        },
      });

      if (order.cartId) {
        await tx.cart.update({
          where: { id: order.cartId },
          data: { status: 'CLEARED' },
        });
      }
    });
  }

  private async markOrderFailed(orderId: string) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        flwStatus: 'failed',
        status: OrderStatus.PAYMENT_FAILED,
      },
    });
  }

  /* ======================================================
     6. LIST / UPDATE / DELETE SAVED METHODS
  ====================================================== */
  listSavedCards(customerId: string) {
    return this.prisma.customerPaymentMethod.findMany({
      where: { customerId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async updateSavedCard(params: {
    customerId: string;
    methodId: string;
    billingName?: string;
    billingLine1?: string;
    billingCity?: string;
    billingPostal?: string;
    billingCountry?: string;
    makeDefault?: boolean;
  }) {
    const method = await this.prisma.customerPaymentMethod.findUnique({
      where: { id: params.methodId },
    });

    if (!method || method.customerId !== params.customerId)
      throw new NotFoundException('Payment method not found');

    if (params.makeDefault) {
      await this.prisma.customerPaymentMethod.updateMany({
        where: { customerId: params.customerId },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerPaymentMethod.update({
      where: { id: params.methodId },
      data: {
        billingName: params.billingName,
        billingLine1: params.billingLine1,
        billingCity: params.billingCity,
        billingPostal: params.billingPostal,
        billingCountry: params.billingCountry,
        isDefault: params.makeDefault ?? undefined,
      },
    });
  }

  deleteSavedCard(customerId: string, methodId: string) {
    return this.prisma.customerPaymentMethod.delete({
      where: { id: methodId, customerId },
    });
  }
}
