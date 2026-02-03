import {
  Controller,
  Post,
  Param,
  Body,
  Get,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaymentsService } from './payments.service';

import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';
import { OptionalCustomerAuthGuard } from '../auth/guards/optional-customer-auth-guard';

import { Customer } from 'src/common/decorators/customer.decorator';
import { DeviceId } from 'src/common/decorators/device-id.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /* ======================================================
     1. PAY USING NEW CARD (INLINE POPUP)
     Guests + Customers
  ====================================================== */
  @Post('orders/:orderId/pay')
  @UseGuards(OptionalCustomerAuthGuard)
  @ApiOperation({ summary: 'Start inline payment using a new card' })
  async payWithNewCard(
    @Param('orderId') orderId: string,
    @Customer() customer?: { id: string },
    @DeviceId() deviceId?: string,
  ) {
    return this.payments.initiateInlinePayment({
      orderId,
      customerId: customer?.id,
      deviceId,
    });
  }

  /* ======================================================
     2. PAY USING SAVED CARD (TOKENIZED CHARGE)
     Customers only
  ====================================================== */
  @Post('orders/:orderId/pay-with-saved')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay using a saved card (tokenized charge)' })
  async payWithSaved(
    @Param('orderId') orderId: string,
    @Body() body: { paymentMethodId: string },
    @Customer() customer: { id: string },
  ) {
    return this.payments.chargeSavedCard({
      orderId,
      customerId: customer.id,
      paymentMethodId: body.paymentMethodId,
    });
  }

  /* ======================================================
     3. RETRY PAYMENT
     - Saved card if provided
     - Inline popup otherwise
     - Works for guests + customers
  ====================================================== */
  @Post('orders/:orderId/retry')
  @UseGuards(OptionalCustomerAuthGuard)
  @ApiOperation({ summary: 'Retry payment for an order' })
  async retryPayment(
    @Param('orderId') orderId: string,
    @Body() body: { paymentMethodId?: string },
    @Customer() customer?: { id: string },
    @DeviceId() deviceId?: string,
  ) {
    return this.payments.retryPayment({
      orderId,
      customerId: customer?.id,
      paymentMethodId: body.paymentMethodId,
      deviceId,
    });
  }

  /* ======================================================
     4. LIST SAVED PAYMENT METHODS  
     (Customer only)
  ====================================================== */
  @Get('methods')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List saved payment methods (cards)' })
  async listMethods(@Customer() customer: { id: string }) {
    return this.payments.listSavedCards(customer.id);
  }

  /* ======================================================
     5. UPDATE SAVED PAYMENT METHOD  
     (Billing name, address, make default)
  ====================================================== */
  @Patch('methods/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update saved payment method details' })
  async updateMethod(
    @Param('id') methodId: string,
    @Body()
    body: {
      billingName?: string;
      billingLine1?: string;
      billingCity?: string;
      billingPostal?: string;
      billingCountry?: string;
      makeDefault?: boolean;
    },
    @Customer() customer: { id: string },
  ) {
    return this.payments.updateSavedCard({
      customerId: customer.id,
      methodId,
      ...body,
    });
  }

  /* ======================================================
     6. DELETE SAVED PAYMENT METHOD  
     (Customer only)
  ====================================================== */
  @Delete('methods/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete saved payment method' })
  async deleteMethod(
    @Param('id') methodId: string,
    @Customer() customer: { id: string },
  ) {
    return this.payments.deleteSavedCard(customer.id, methodId);
  }
}
