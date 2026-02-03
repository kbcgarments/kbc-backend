import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TranslationService } from '../products/translation.service';
import { SupabaseUploadService } from 'src/common/utils/supabase-upload.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, SupabaseUploadService, TranslationService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
