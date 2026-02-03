import { IsOptional, IsString } from 'class-validator';

export class UpdateOrderShippingDto {
  @IsString()
  shippingFullName!: string;

  @IsString()
  shippingPhone!: string;

  @IsString()
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

  @IsOptional()
  @IsString()
  note?: string;
}
