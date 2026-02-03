import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class PayWithSavedCardDto {
  @ApiProperty({
    description: 'ID of the saved payment method to charge',
    example: 'cm1abc123...',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethodId!: string;
}
