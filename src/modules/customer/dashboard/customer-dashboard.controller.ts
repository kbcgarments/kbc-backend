import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Customer } from 'src/common/decorators/customer.decorator';
import { CustomerAuthGuard } from 'src/modules/auth/guards/customer-auth.guard';
import { CustomerDashboardService } from './customer-dashboard.service';
import { Customer as CustomerEntity } from '@prisma/client';

@ApiTags('Customer • Dashboard')
@ApiBearerAuth()
@UseGuards(CustomerAuthGuard)
@Controller('customer/dashboard')
export class CustomerDashboardController {
  constructor(private readonly dashboard: CustomerDashboardService) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Get customer dashboard metrics',
    description:
      'Returns order counts, spending summary, saved addresses, payment methods, and last order.',
  })
  getMetrics(@Customer() customer: CustomerEntity) {
    return this.dashboard.getCustomerDashboardMetrics(customer.id);
  }
}
