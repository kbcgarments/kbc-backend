import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import crypto from 'crypto';

@Injectable()
export class CustomerAddressService {
  constructor(private readonly prisma: PrismaService) {}

  private generateAddressHash(input: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  }) {
    return crypto
      .createHash('sha256')
      .update(
        `${input.street}|${input.city}|${input.state ?? ''}|${input.postalCode ?? ''}|${input.country}`,
      )
      .digest('hex');
  }

  async list(customerId: string) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
    });
  }

  async create(customerId: string, dto: CreateCustomerAddressDto) {
    const addressHash = this.generateAddressHash(dto);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.upsert({
        where: {
          customerId_addressHash: {
            customerId,
            addressHash,
          },
        },
        create: {
          customerId,
          addressHash,
          ...dto,
          isDefault: dto.isDefault ?? false,
        },
        update: {
          ...dto,
        },
      });
    });
  }

  async update(
    customerId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) throw new NotFoundException('Address not found');
    if (address.customerId !== customerId) throw new ForbiddenException();

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id: addressId },
        data: dto,
      });
    });
  }

  async remove(customerId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) throw new NotFoundException();
    if (address.customerId !== customerId) throw new ForbiddenException();

    return this.prisma.customerAddress.delete({
      where: { id: addressId },
    });
  }

  async setDefault(customerId: string, addressId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });

      return tx.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }
}
