import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { CustomerAddressService } from './customer-address.service';

import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { Customer as CustomerEntity } from '@prisma/client';
import { CustomerAuthGuard } from '../../auth/guards/customer-auth.guard';
import { Customer } from 'src/common/decorators/customer.decorator';

@ApiTags('Customer • Addresses')
@ApiBearerAuth()
@UseGuards(CustomerAuthGuard)
@Controller('customer/addresses')
export class CustomerAddressController {
  constructor(private readonly service: CustomerAddressService) {}

  /* ======================================================
     LIST CUSTOMER ADDRESSES
  ====================================================== */

  @Get()
  @ApiOperation({
    summary: 'List customer addresses',
    description:
      'Returns all saved addresses for the authenticated customer. Default address is returned first.',
  })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully',
  })
  list(@Customer() customer: CustomerEntity) {
    return this.service.list(customer.id);
  }

  /* ======================================================
     CREATE ADDRESS
  ====================================================== */

  @Post()
  @ApiOperation({
    summary: 'Create a new customer address',
    description:
      'Creates a new address for the authenticated customer. If marked as default, all other addresses are unset.',
  })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
  })
  create(
    @Customer() customer: CustomerEntity,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.service.create(customer.id, dto);
  }

  /* ======================================================
     UPDATE ADDRESS
  ====================================================== */

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an existing address',
    description:
      'Updates an address belonging to the authenticated customer. Ownership is enforced.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer address ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
  })
  update(
    @Customer() customer: CustomerEntity,
    @Param('id') addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.service.update(customer.id, addressId, dto);
  }

  /* ======================================================
     SET DEFAULT ADDRESS
  ====================================================== */

  @Patch(':id/default')
  @ApiOperation({
    summary: 'Set default address',
    description:
      'Marks the specified address as the default address and unsets all others.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer address ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Default address updated successfully',
  })
  setDefault(
    @Customer() customer: CustomerEntity,
    @Param('id') addressId: string,
  ) {
    return this.service.setDefault(customer.id, addressId);
  }

  /* ======================================================
     DELETE ADDRESS
  ====================================================== */

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete customer address',
    description:
      'Deletes an address belonging to the authenticated customer. Cannot affect other customers.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer address ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Address deleted successfully',
  })
  remove(@Customer() customer: CustomerEntity, @Param('id') addressId: string) {
    return this.service.remove(customer.id, addressId);
  }
}
