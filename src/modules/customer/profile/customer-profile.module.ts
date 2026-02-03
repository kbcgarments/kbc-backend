import { Module } from '@nestjs/common';
import { CustomerController } from './customer-profile.controller';
import { CustomerService } from './customer-profile.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService, PrismaService, JwtService],
})
export class CustomerProfileModule {}
