import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AdminModule } from './modules/admin/admin.module';
import { VariantsModule } from './modules/variants/variants.module';
import { CurrencyRateModule } from './modules/currency/currency-rate.module';
import { CartModule } from './modules/cart/cart.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { ActivityModule } from './modules/activity/activity.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { AdminHomepageModule } from './modules/admin/homepage/admin-homepage.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CustomerAddressModule } from './modules/customer/address/customer-address.module';
import { CustomerProfileModule } from './modules/customer/profile/customer-profile.module';
import { CustomerDashboardModule } from './modules/customer/dashboard/customer-dashboard.module';
import { SearchModule } from './modules/search/search.module';
import { ProductTypesModule } from './modules/product-types/product-types.module';

@Module({
  imports: [
    // ─────────────────────────────
    // Core / Infrastructure
    // ─────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,

    // ─────────────────────────────
    // Auth & Identity
    // ─────────────────────────────
    AuthModule,

    // ─────────────────────────────
    // Admin
    // ─────────────────────────────
    AdminModule,
    AdminHomepageModule,

    // ─────────────────────────────
    // Commerce / Shopping
    // ─────────────────────────────
    CommerceModule,
    CartModule,
    WishlistModule,
    OrdersModule,
    PaymentsModule,

    // ─────────────────────────────
    // Catalog
    // ─────────────────────────────
    CategoriesModule,
    ProductsModule,
    VariantsModule,
    ProductTypesModule,

    // ─────────────────────────────
    // Customer
    // ─────────────────────────────
    CustomerAddressModule,
    CustomerDashboardModule,
    CustomerProfileModule,

    // ─────────────────────────────
    // Supporting / Cross-cutting
    // ─────────────────────────────
    ActivityModule,
    CurrencyRateModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
