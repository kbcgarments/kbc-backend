import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { CancellationSource, OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;

  // PROCESSING
  @IsOptional()
  @IsString()
  expectedShipDate?: string;

  // SHIPPED
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  estimatedDelivery?: string;

  @IsOptional()
  @IsString()
  trackingLink?: string;

  // OUT_FOR_DELIVERY
  @IsOptional()
  @IsString()
  outForDeliveryTime?: string;

  // DELIVERED
  @IsOptional()
  @IsString()
  deliveredDate?: string;

  @IsOptional()
  @IsString()
  deliveredTime?: string;

  // DELIVERY_FAILED
  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @IsString()
  nextAttemptDate?: string;

  // DELIVERY_DELAYED
  @IsOptional()
  @IsString()
  delayReason?: string;

  @IsOptional()
  @IsString()
  newDeliveryDate?: string;

  // CANCELLATION
  @IsOptional()
  @IsEnum(CancellationSource)
  cancelledBy?: CancellationSource;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsString()
  refundMessage?: string;

  @IsOptional()
  @IsNumber()
  refundAmount?: number;
}
