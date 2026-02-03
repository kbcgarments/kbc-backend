import { Module } from '@nestjs/common';
import { CustomerDashboardController } from './customer-dashboard.controller';
import { CustomerDashboardService } from './customer-dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerProfileModule } from '../profile/customer-profile.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [CustomerProfileModule],
  controllers: [CustomerDashboardController],
  providers: [CustomerDashboardService, PrismaService, JwtService],
})
export class CustomerDashboardModule {}
