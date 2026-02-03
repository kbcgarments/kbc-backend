import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsEmail,
} from 'class-validator';

export class CreateCustomerFeedbackDto {
  @IsString()
  orderNumber!: string;

  @IsEnum(['en', 'fr', 'es', 'zu'])
  language!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsString()
  message!: string;
}
