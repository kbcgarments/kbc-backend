import { Controller, Get, UseGuards } from '@nestjs/common';
import { CommerceService } from './commerce.service';
import { HomepageResponseDto } from './dto/homepage-response.dto';
import { OptionalCustomerAuthGuard } from '../auth/guards/optional-customer-auth-guard';

@Controller('commerce')
@UseGuards(OptionalCustomerAuthGuard)
export class CommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get('homepage')
  @UseGuards(OptionalCustomerAuthGuard)
  async getHomepage(): Promise<HomepageResponseDto> {
    return this.commerceService.getHomepage();
  }
}
