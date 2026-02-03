import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { OptionalCustomerAuthGuard } from '../auth/guards/optional-customer-auth-guard';
import { DeviceGuard } from '../auth/guards/device.guard';
import { Customer } from 'src/common/decorators/customer.decorator';
import { DeviceId } from 'src/common/decorators/device-id.decorator';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(OptionalCustomerAuthGuard, DeviceGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart (guest or customer)' })
  getCart(
    @DeviceId() deviceId: string,
    @Customer() customer?: { id: string | undefined },
  ) {
    return this.cart.getCart(deviceId, customer?.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(
    @Body() dto: AddItemDto,
    @DeviceId() deviceId: string,
    @Customer() customer?: { id: string },
  ) {
    return this.cart.addItem(dto, deviceId, customer?.id);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.cart.updateItem(id, dto);
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string) {
    return this.cart.removeItem(id);
  }
  @Delete()
  @ApiOperation({ summary: 'Clear all cart items' })
  clearCart(
    @DeviceId() deviceId: string,
    @Customer() customer?: { id?: string },
  ) {
    return this.cart.clearCart(deviceId, customer?.id);
  }
}
