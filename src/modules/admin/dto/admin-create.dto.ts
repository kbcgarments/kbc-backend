import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class AdminCreateDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: AdminRole, required: true })
  @IsEnum(AdminRole)
  role!: AdminRole;

  @ApiProperty({ required: false })
  @IsString()
  name?: string;
}
