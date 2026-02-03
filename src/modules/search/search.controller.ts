import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { Customer } from 'src/common/decorators/customer.decorator';
import { DeviceId } from 'src/common/decorators/device-id.decorator';
import { OptionalCustomerAuthGuard } from '../auth/guards/optional-customer-auth-guard';
import { DeviceGuard } from '../auth/guards/device.guard';

@UseGuards(OptionalCustomerAuthGuard, DeviceGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  async searchProducts(
    @Query('q') q: string,
    @DeviceId() deviceId: string,
    @Customer() customer?: { id: string },
  ) {
    if (!q || q.trim().length < 3) return [];
    await this.search.saveSearch({
      customerId: customer?.id ?? null,
      deviceId,
      query: q.trim(),
    });

    return this.search.searchProducts(q.trim());
  }

  @Get('history')
  getHistory(
    @DeviceId() deviceId: string,
    @Customer() customer?: { id: string },
  ) {
    return this.search.getHistory({
      customerId: customer?.id ?? null,
      deviceId,
    });
  }

  @Delete('history/:id')
  deleteHistory(
    @Param('id') id: string,
    @Customer() customer: { id: string },
    @DeviceId() deviceId: string,
  ) {
    return this.search.deleteHistory({
      id,
      customerId: customer?.id ?? null,
      deviceId,
    });
  }
}
