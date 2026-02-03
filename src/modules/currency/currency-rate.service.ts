import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateCurrencyRateDto } from './dto/current-rate.dto';
import { AdminUser, ActivityType, Currency } from '@prisma/client';
import { logActivity } from '../activity/activity-logger.util';

/* ======================================================
   TYPES
====================================================== */

interface CurrencyInput {
  currency: Currency;
  rate: number;
}

/* ======================================================
   SERVICE
====================================================== */

@Injectable()
export class CurrencyRateService {
  constructor(private readonly prisma: PrismaService) {}

  /* ======================================================
     HELPERS
  ====================================================== */

  private getActorLabel(actor: AdminUser): string {
    return actor.name ?? actor.email ?? actor.id;
  }

  private validateRate(rate: number) {
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new BadRequestException('Exchange rate must be a positive number');
    }
  }

  /* ======================================================
     READ
  ====================================================== */

  async getAll() {
    return this.prisma.currencyRate.findMany({
      orderBy: { currency: 'asc' },
    });
  }

  /* ======================================================
     CREATE (SINGLE OR BULK)
  ====================================================== */

  async create(actor: AdminUser, data: CurrencyInput | CurrencyInput[]) {
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      this.validateRate(item.rate);

      await this.prisma.currencyRate.upsert({
        where: { currency: item.currency },
        update: { rate: item.rate },
        create: {
          currency: item.currency,
          rate: item.rate,
        },
      });

      await logActivity(this.prisma, {
        actor,
        action: ActivityType.CURRENCY_RATE_CREATED,
        entity: 'CurrencyRate',
        entityId: item.currency,
        message: `${this.getActorLabel(actor)} set exchange rate for ${
          item.currency
        } at ${item.rate}.`,
      });
    }

    return { success: true };
  }

  /* ======================================================
     UPDATE
  ====================================================== */

  async updateRate(actor: AdminUser, dto: UpdateCurrencyRateDto) {
    this.validateRate(dto.rate);

    const existing = await this.prisma.currencyRate.findUnique({
      where: { currency: dto.currency },
    });

    if (!existing) {
      throw new NotFoundException(
        `Exchange rate for ${dto.currency} does not exist.`,
      );
    }

    const updated = await this.prisma.currencyRate.update({
      where: { currency: dto.currency },
      data: { rate: dto.rate },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.CURRENCY_RATE_UPDATED,
      entity: 'CurrencyRate',
      entityId: dto.currency,
      message: `${this.getActorLabel(actor)} updated exchange rate for ${
        dto.currency
      } from ${existing.rate} to ${dto.rate}.`,
    });

    return updated;
  }
}
