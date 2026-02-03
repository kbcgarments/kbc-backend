import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RetryPaymentDto {
  @ApiPropertyOptional({
    description: 'Optional: ID of saved payment method to use for retry',
    example: 'cm1abc123...',
  })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}
