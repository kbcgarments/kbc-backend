import { Module } from '@nestjs/common';
import { CustomerAddressController } from './customer-address.controller';
import { CustomerAddressService } from './customer-address.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [CustomerAddressController],
  providers: [CustomerAddressService, PrismaService, JwtService],
})
export class CustomerAddressModule {}
