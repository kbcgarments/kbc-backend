import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  customerName!: string;

  @IsString()
  quote!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  roleOrContext?: string;

  @IsOptional()
  @IsInt()
  rating?: number;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
