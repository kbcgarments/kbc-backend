import { Module } from '@nestjs/common';
import { SupabaseUploadService } from 'src/common/utils/supabase-upload.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminHomepageController } from './admin-homepage.controller';
import { AdminHomepageService } from './admin-homepage.service';
import { TranslationService } from 'src/modules/products/translation.service';
import { CustomerFeedbackController } from './customer-feedback.controller';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  controllers: [AdminHomepageController, CustomerFeedbackController],
  providers: [
    AdminHomepageService,
    PrismaService,
    SupabaseUploadService,
    TranslationService,
    JwtService,
  ],
})
export class AdminHomepageModule {}
