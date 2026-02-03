import { Controller, UseGuards, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Customer } from 'src/common/decorators/customer.decorator';
import { OptionalCustomerAuthGuard } from 'src/modules/auth/guards/optional-customer-auth-guard';
import { AdminHomepageService } from './admin-homepage.service';
import { CreateCustomerFeedbackDto } from './dto/create-customer-feedback.dto';

@ApiTags('Customer • Feedback')
@Controller('feedback')
@UseGuards(OptionalCustomerAuthGuard)
export class CustomerFeedbackController {
  constructor(private readonly homepage: AdminHomepageService) {}

  @Post()
  @UseGuards(OptionalCustomerAuthGuard)
  @ApiOperation({ summary: 'Submit feedback for an order' })
  @ApiBody({ type: CreateCustomerFeedbackDto })
  async submitFeedback(
    @Customer() customer: { id?: string } | null,
    @Body() dto: CreateCustomerFeedbackDto,
  ) {
    const customerId = customer?.id ?? null;
    return this.homepage.submitCustomerFeedback(customerId, dto);
  }
}
