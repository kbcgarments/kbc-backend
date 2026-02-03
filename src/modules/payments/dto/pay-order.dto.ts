import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PayOrderDto {
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsBoolean()
  savePaymentMethod?: boolean;

  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}
