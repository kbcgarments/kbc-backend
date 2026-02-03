import { FeedbackStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReviewFeedbackDto {
  @IsEnum(FeedbackStatus)
  status!: FeedbackStatus;
}

export class PromoteTestimonialDto {
  @IsString()
  feedbackId!: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}
