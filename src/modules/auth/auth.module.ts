/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { PrismaService } from 'src/prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { OrdersService } from '../orders/orders.service';
import { EmailService } from '../notifications/email/email.service';
import { ConfigModule } from '@nestjs/config';
import { FlutterwaveService } from '../payments/flutterwave.service';

const jwtSecret = process.env.JWT_SECRET ?? '';
const jwtExpiresIn: number | string =
  (process.env.JWT_EXPIRES_IN as string | number) ?? '7d';

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: jwtExpiresIn as any,
      },
    }),
    ConfigModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    CartService,
    WishlistService,
    OrdersService,
    EmailService,
    FlutterwaveService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
