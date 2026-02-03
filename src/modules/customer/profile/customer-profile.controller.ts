import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Get,
  Req,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiResponse,
} from '@nestjs/swagger';

import { CustomerService } from './customer-profile.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { Customer } from 'src/common/decorators/customer.decorator';
import { CustomerAuthGuard } from 'src/modules/auth/guards/customer-auth.guard';
import {
  AdminOnly,
  CatalogManagerOnly,
} from 'src/modules/admin/decorators/roles.decorator';
import { AdminAuthGuard } from 'src/modules/admin/guards/admin-auth.guard';
import { RolesGuard } from 'src/modules/admin/guards/roles.guard';
import { AdminUser } from '@prisma/client';
interface AuthenticatedRequest extends Request {
  user: AdminUser;
}
@ApiTags('Customer • Profile')
@ApiBearerAuth()
@Controller('customer/profile')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /* ======================================================
     GET PROFILE
  ====================================================== */

  @Get()
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Get authenticated customer profile' })
  @ApiOkResponse({ description: 'Customer profile retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getProfile(@Customer() customer: { id: string }) {
    return this.customerService.getProfile(customer.id);
  }
  @Get('active')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @CatalogManagerOnly()
  @ApiOperation({ summary: 'Get all active customers (admin)' })
  @ApiOkResponse({ description: 'Active customers retrieved successfully' })
  getActiveCustomers() {
    return this.customerService.listActiveCustomers();
  }

  /* ======================================================
     UPDATE PROFILE
  ====================================================== */
  @Patch()
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Update customer profile information' })
  @ApiOkResponse({ description: 'Customer profile updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid or empty update payload' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  updateProfile(
    @Customer() customer: { id: string },
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customerService.updateProfile(customer.id, dto);
  }

  @Patch('deactivate')
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Deactivate customer account' })
  @ApiOkResponse({ description: 'Account deactivated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  deactivate(@Customer() customer: { id: string }) {
    return this.customerService.deactivateAccount(customer.id);
  }
  @Patch(':id/deactivate')
  @AdminOnly()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Deactivate customer account (admin)' })
  @ApiOkResponse({ description: 'Customer deactivated successfully' })
  deactivateCustomer(
    @Req() req: AuthenticatedRequest,
    @Param('id') customerId: string,
  ) {
    return this.customerService.adminDeactivateCustomer(req.user, customerId);
  }
  @Patch(':id/reactivate')
  @AdminOnly()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Reactivate a deactivated customer account' })
  @ApiResponse({
    status: 200,
    description: 'Customer reactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 400, description: 'Customer already active' })
  reactivate(
    @Req() req: AuthenticatedRequest,
    @Param('id') customerId: string,
  ) {
    return this.customerService.adminReactivateCustomer(req.user, customerId);
  }
}
