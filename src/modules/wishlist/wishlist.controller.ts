import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { OptionalCustomerAuthGuard } from '../auth/guards/optional-customer-auth-guard';
import { DeviceGuard } from '../auth/guards/device.guard';
import { DeviceId } from 'src/common/decorators/device-id.decorator';
import { Customer } from 'src/common/decorators/customer.decorator';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(OptionalCustomerAuthGuard, DeviceGuard)
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  /* ===============================
     GET WISHLIST
  =============================== */
  @Get()
  @ApiOperation({ summary: 'Get wishlist items (guest or customer)' })
  getWishlist(
    @DeviceId() deviceId: string,
    @Customer() customer?: { id?: string },
  ) {
    return this.wishlist.getWishlist(deviceId, customer?.id);
  }

  /* ===============================
     TOGGLE ITEM
  =============================== */
  @Post('toggle')
  @ApiOperation({ summary: 'Toggle wishlist item' })
  toggle(
    @Body('productId') productId: string,
    @DeviceId() deviceId: string,
    @Customer() customer?: { id?: string },
  ) {
    return this.wishlist.toggle(productId, deviceId, customer?.id);
  }

  /* ===============================
     REMOVE ITEM
  =============================== */
  @Delete(':productId')
  @ApiOperation({ summary: 'Remove wishlist item' })
  remove(
    @Param('productId') productId: string,
    @DeviceId() deviceId: string,
    @Customer() customer?: { id?: string },
  ) {
    return this.wishlist.remove(productId, deviceId, customer?.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all wishlist items' })
  clearWishlist(
    @DeviceId() deviceId: string,
    @Customer() customer?: { id?: string },
  ) {
    return this.wishlist.clearWishlist(deviceId, customer?.id);
  }
}
