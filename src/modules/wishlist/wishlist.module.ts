import { Module } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { TranslationService } from '../products/translation.service';
import { SupabaseUploadService } from 'src/common/utils/supabase-upload.service';
import { AuthService } from '../auth/auth.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { CartService } from '../cart/cart.service';
import { JwtService } from '@nestjs/jwt';
import { OrdersService } from '../orders/orders.service';
import { SearchModule } from '../search/search.module';
import { EmailService } from '../notifications/email/email.service';
import { FlutterwaveService } from '../payments/flutterwave.service';

@Module({
  imports: [SearchModule],
  controllers: [WishlistController],
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
  exports: [WishlistService],
})
export class WishlistModule {}
