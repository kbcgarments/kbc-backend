import { Module } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { SupabaseUploadService } from 'src/common/utils/supabase-upload.service';
import { SearchModule } from '../search/search.module';
import { ProductsPublicController } from './public/products.public.controller';
import { ProductsAdminController } from './admin/products.admin.controller';
import { ProductsAdminService } from './admin/products.admin.service';
import { ProductsPublicService } from './public/products.public.service';
import { ProductsService } from './products.service';
import { EmailService } from '../notifications/email/email.service';

@Module({
  imports: [SearchModule],
  controllers: [ProductsPublicController, ProductsAdminController],
  providers: [
    ProductsPublicService,
    ProductsAdminService,
    TranslationService,
    SupabaseUploadService,
    ProductsService,
    EmailService,
  ],
  exports: [ProductsPublicService, ProductsAdminService],
})
export class ProductsModule {}
