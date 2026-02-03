/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Flutterwave from 'flutterwave-node-v3';
import axios from 'axios';

function getCountryFromCurrency(currency: string): string {
  const map: Record<string, string> = {
    USD: 'US',
    EUR: 'EU',
    GBP: 'GB',
    NGN: 'NG',
    ZAR: 'ZA',
  };
  return map[currency] || 'US';
}
export interface FlutterwaveVerifyResponse {
  status: string;
  message?: string;
  data?: {
    status?: string;
    [key: string]: unknown;
  };
}

export interface FlutterwaveRefundResponse {
  status: string;
  message: string;
  data: {
    id: number;
    account_id: number;
    tx_id: number;
    flw_ref: string;
    wallet_id: number;
    amount_refunded: number;
    status: string;
    destination: string;
    meta: Record<string, unknown>;
    created_at: string;
    [key: string]: unknown;
  };
}
@Injectable()
export class FlutterwaveService {
  private readonly flw: Flutterwave;
  private readonly publicKey: string;
  private readonly secretKey: string;

  constructor(private readonly config: ConfigService) {
    this.publicKey = this.config.get<string>('FLW_PUBLIC_KEY')!;
    this.secretKey = this.config.get<string>('FLW_SECRET_KEY')!;

    if (!this.publicKey || !this.secretKey) {
      throw new Error('Flutterwave keys missing — check env variables.');
    }

    this.flw = new Flutterwave(this.publicKey, this.secretKey);
  }

  /* ======================================================
     BUILD INLINE POPUP CONFIG (no API call needed)
  ====================================================== */
  buildInlineConfig(data: {
    tx_ref: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
      name?: string;
      phone_number?: string;
    };
    meta?: Record<string, any>;
    customizations?: Record<string, any>;
  }) {
    return {
      public_key: this.publicKey,
      tx_ref: data.tx_ref,
      amount: data.amount,
      currency: data.currency,
      payment_options: 'card,banktransfer,ussd,account',
      customer: data.customer,
      meta: data.meta,
      customizations: data.customizations ?? {
        title: 'Complete Payment',
        description: 'Secure Checkout',
      },
    };
  }

  /* ======================================================
     VERIFY TRANSACTION
  ====================================================== */
  async verifyTransaction(
    id: number | string,
  ): Promise<FlutterwaveVerifyResponse> {
    const txId = typeof id === 'string' ? parseInt(id, 10) : id;

    return (this.flw as any).Transaction.verify({
      id: txId,
    }) as Promise<FlutterwaveVerifyResponse>;
  }

  /* ======================================================
     TOKENIZED CARD CHARGE
  ====================================================== */
  async chargeSavedCard(payload: {
    token: string;
    amount: number;
    currency: string;
    email: string;
    tx_ref: string;
  }): Promise<any> {
    return (this.flw as any).Tokenized.charge({
      token: payload.token,
      currency: payload.currency,
      country: getCountryFromCurrency(payload.currency),
      amount: payload.amount,
      email: payload.email,
      tx_ref: payload.tx_ref,
    }) as Promise<any>;
  }

  /* ======================================================
     CARD DETAILS (from webhook)
  ====================================================== */
  extractCardDetails(flw: any) {
    const card = flw?.data?.card;
    if (!card?.token) return null;

    let expMonth: number | null = null;
    let expYear: number | null = null;

    if (card.expiry) {
      const [mm, yy] = card.expiry.split('/');
      expMonth = parseInt(mm as string, 10);
      expYear = parseInt(yy as string, 10) + 2000;
    }

    return {
      token: (card.token as string) ?? null,
      brand: (card.type as string) ?? null,
      last4: (card.last_4digits as string) ?? null,
      expMonth,
      expYear,
    };
  }
  async refund(
    transactionId: string,
    amount: number,
    reason = 'Customer Refund',
    idempotencyKey: string,
  ): Promise<FlutterwaveRefundResponse> {
    const response = await axios.post(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/refund`,
      {
        amount,
        comments: reason,
      },
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );

    return response.data as FlutterwaveRefundResponse;
  }
}
