import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { FlutterwaveService } from '../payments/flutterwave.service';
import { EmailService } from '../notifications/email/email.service';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    PrismaService,
    JwtService,
    EmailService,
    FlutterwaveService,
  ],
})
export class OrdersModule {}
