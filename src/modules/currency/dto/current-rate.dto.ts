import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { Currency } from '@prisma/client';

export class UpdateCurrencyRateDto {
  @ApiProperty({
    example: 'NGN',
    description: 'Currency code (NGN, ZAR, GBP, EUR, USD)',
  })
  @IsString()
  currency!: Currency;

  @ApiProperty({
    example: 1600,
    description: 'How much 1 USD equals in this currency',
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  rate!: number;
}
