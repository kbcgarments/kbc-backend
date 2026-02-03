import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupabaseUploadService } from 'src/common/utils/supabase-upload.service';
import { ProductsService } from '../products/products.service';
import { TranslationService } from '../products/translation.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { OrdersService } from '../orders/orders.service';
import { JwtService } from '@nestjs/jwt';
import { SearchModule } from '../search/search.module';
import { EmailService } from '../notifications/email/email.service';
import { FlutterwaveService } from '../payments/flutterwave.service';

@Module({
  imports: [SearchModule],
  controllers: [CartController],
  providers: [
    WishlistService,
    PrismaService,
    ProductsService,
    TranslationService,
    SupabaseUploadService,
    AuthService,
    JwtStrategy,
    CartService,
    OrdersService,
    JwtService,
    EmailService,
    FlutterwaveService,
  ],
  exports: [CartService],
})
export class CartModule {}
