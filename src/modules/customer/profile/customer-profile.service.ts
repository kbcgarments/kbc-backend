import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { logActivity } from 'src/modules/activity/activity-logger.util';
import { ActivityType, AdminUser } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /* ======================================================
     GET CUSTOMER PROFILE
     (useful for profile page hydration)
  ====================================================== */

  async getProfile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  /* ======================================================
     UPDATE CUSTOMER PROFILE
     (name + phone only)
  ====================================================== */

  async updateProfile(customerId: string, dto: UpdateCustomerProfileDto) {
    if (!dto.name && !dto.phone) {
      throw new BadRequestException('Nothing to update');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  /* ======================================================
     SOFT DELETE CUSTOMER ACCOUNT (OPTIONAL)
     (future-proof, not destructive)
  ====================================================== */

  async deactivateAccount(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (customer.deletedAt) {
      throw new BadRequestException('Account is already deactivated');
    }

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Your account has been deactivated',
    };
  }

  async listActiveCustomers() {
    return this.prisma.customer.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        deletedAt: true,
      },
    });
  }
  async adminDeactivateCustomer(actor: AdminUser, customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.deletedAt) {
      throw new BadRequestException('Customer is already deactivated');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        deletedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        deletedAt: true,
      },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.CUSTOMER_DEACTIVATED,
      entity: 'Customer',
      entityId: customerId,
      message: `${actor?.email} deactivated customer ${customer.email}`,
    });

    return {
      success: true,
      customer: updated,
    };
  }
  async adminReactivateCustomer(actor: AdminUser, customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!customer.deletedAt) {
      throw new BadRequestException('Customer account is already active');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        deletedAt: null,
        lastLoginAt: null,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        deletedAt: true,
      },
    });

    await logActivity(this.prisma, {
      actor,
      action: ActivityType.CUSTOMER_REACTIVATED,
      entity: 'Customer',
      entityId: customerId,
      message: `${actor.email} reactivated customer ${customer.email}`,
    });

    return {
      success: true,
      customer: updated,
    };
  }
}
