import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from 'src/prisma/prisma.service';

import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { FlutterwaveWebhookController } from './flutterwave-webhook.controller';
import { FlutterwaveService } from './flutterwave.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../notifications/email/email.service';
import { OrdersService } from '../orders/orders.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController, FlutterwaveWebhookController],
  providers: [
    PrismaService,
    PaymentsService,
    FlutterwaveService,
    JwtService,
    EmailService,
    OrdersService,
  ],
})
export class PaymentsModule {}
