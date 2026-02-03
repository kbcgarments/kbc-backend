import { Module } from '@nestjs/common';
import { ProductTypesService } from './product-types.service';
import { ProductTypesController } from './product-types.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TranslationService } from '../products/translation.service';

@Module({
  controllers: [ProductTypesController],
  providers: [
    ProductTypesService,
    PrismaService,
    JwtService,
    TranslationService,
  ],
  exports: [ProductTypesService],
})
export class ProductTypesModule {}
