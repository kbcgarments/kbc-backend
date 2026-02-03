import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentMethodDto {
  /* ---------- behavior ---------- */
  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  delete?: boolean;

  /* ---------- billing updates ---------- */
  @IsOptional()
  @IsString()
  billingName?: string;

  @IsOptional()
  @IsString()
  billingLine1?: string;

  @IsOptional()
  @IsString()
  billingCity?: string;

  @IsOptional()
  @IsString()
  billingPostal?: string;

  @IsOptional()
  @IsString()
  billingCountry?: string;
}
