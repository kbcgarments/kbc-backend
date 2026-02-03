import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCustomerAddressDto {
  @IsString()
  fullName!: string;

  @IsString()
  phone!: string;

  @IsString()
  street!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsString()
  country!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
