import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsOptional()
  @IsBoolean()
  savePaymentMethod?: boolean;

  // Optional billing details (recommended, never required)
  @IsOptional()
  @IsString()
  billingName?: string;

  @IsOptional()
  @IsString()
  billingCountry?: string;

  @IsOptional()
  @IsString()
  billingLine1?: string;

  @IsOptional()
  @IsString()
  billingCity?: string;

  @IsOptional()
  @IsString()
  billingPostal?: string;
}
