import {
  Controller,
  Post,
  Param,
  Body,
  Get,
  Query,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderStatus, AdminUser } from '@prisma/client';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto';

import { OptionalCustomerAuthGuard } from '../auth/guards/optional-customer-auth-guard';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';

import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { AdminOnly } from '../admin/decorators/roles.decorator';

import { Customer } from 'src/common/decorators/customer.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /* ======================================================
     CREATE ORDER (PUBLIC)
  ====================================================== */
  @Post('checkout/:cartId')
  @UseGuards(OptionalCustomerAuthGuard)
  @ApiOperation({ summary: 'Checkout cart and create order' })
  checkout(
    @Param('cartId') cartId: string,
    @Body() dto: CreateOrderDto,
    @Customer() customer?: { id: string },
  ) {
    return this.orders.checkoutFromCart(cartId, dto, customer?.id);
  }

  /* ======================================================
     PUBLIC ORDER TRACKING
  ====================================================== */
  @Get('track/:orderNumber')
  @ApiOperation({ summary: 'Track order by public order number' })
  track(@Param('orderNumber') orderNumber: string) {
    return this.orders.trackOrder(orderNumber);
  }

  /* ======================================================
     CUSTOMER — LIST MY ORDERS
  ====================================================== */
  @Get('my')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get orders for logged-in customer' })
  customerOrders(@Customer() customer: { id: string }) {
    return this.orders.customerListOrders(customer.id);
  }

  /* ======================================================
     CUSTOMER — SINGLE ORDER BY ID (owned)
  ====================================================== */
  @Get('my/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single customer order' })
  customerOrder(@Param('id') id: string, @Customer() customer: { id: string }) {
    return this.orders.customerGetOrder(customer.id, id);
  }

  /* ======================================================
     CANCEL (customer or guest)
  ====================================================== */
  @Post(':id/cancel')
  @UseGuards(OptionalCustomerAuthGuard)
  @ApiOperation({ summary: 'Cancel an order (customer or guest)' })
  cancelOrder(
    @Param('id') orderId: string,
    @Body('deviceId') deviceId: string,
    @Customer() customer?: { id: string },
  ) {
    return this.orders.customerCancelOrder(
      deviceId,
      customer?.id ?? null,
      orderId,
    );
  }

  /* ======================================================
     ADMIN — LIST ORDERS
  ====================================================== */
  @Get()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all orders (admin)' })
  adminList(@Query('status') status?: OrderStatus) {
    return this.orders.adminListOrders(status);
  }

  /* ======================================================
     ADMIN — SINGLE ORDER (UUID ONLY)
     IMPORTANT: this prevents collision with /:orderNumber
  ====================================================== */
  @Get(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single order (admin)' })
  adminGetOrder(@Param('id') id: string) {
    return this.orders.adminGetOrder(id);
  }

  /* ======================================================
     CUSTOMER — SINGLE ORDER BY ORDER NUMBER
     NOTE: kept exactly as your original URL: /orders/:orderNumber
  ====================================================== */
  @Get(':orderNumber')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single customer order by orderNumber' })
  customerOrderByNumber(@Param('orderNumber') orderNumber: string) {
    return this.orders.customerGetOrderByNumber(orderNumber);
  }

  /* ======================================================
     ADMIN — UPDATE STATUS
  ====================================================== */
  @Patch(':id/status')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (admin)' })
  updateStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: { user: AdminUser },
  ) {
    return this.orders.updateOrderStatus(orderId, dto, req.user.id);
  }

  /* ======================================================
     ADMIN — UPDATE SHIPPING
  ====================================================== */
  @Patch(':id/shipping')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order shipping address (admin)' })
  updateShipping(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderShippingDto,
    @Req() req: { user: AdminUser },
  ) {
    return this.orders.updateOrderShipping(orderId, dto, req.user.id);
  }
}
