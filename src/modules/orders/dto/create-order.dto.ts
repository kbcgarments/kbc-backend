import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/* You can move this enum elsewhere if reused */
export enum SupportedCurrency {
  USD = 'USD',
  NGN = 'NGN',
  ZAR = 'ZAR',
  EUR = 'EUR',
  GBP = 'GBP',
}

export class CreateOrderDto {
  /* =========================
     CUSTOMER CONTACT
  ========================= */

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  phone?: string;

  /* =========================
     SHIPPING SNAPSHOT
     (immutable copy)
  ========================= */

  @IsString()
  @MinLength(2)
  shippingFullName!: string;

  @IsString()
  @MinLength(7)
  shippingPhone!: string;

  @IsString()
  @MinLength(5)
  shippingStreet!: string;

  @IsString()
  shippingCity!: string;

  @IsOptional()
  @IsString()
  shippingState?: string;

  @IsOptional()
  @IsString()
  shippingPostal?: string;

  @IsString()
  shippingCountry!: string;

  /* =========================
     PAYMENT / CURRENCY
  ========================= */

  @IsEnum(SupportedCurrency)
  currency!: SupportedCurrency;

  /* =========================
     CUSTOMER PREFERENCE
  ========================= */

  @IsOptional()
  @IsBoolean()
  saveAddress?: boolean;

  @IsOptional()
  @IsString()
  customerNote?: string;
}
