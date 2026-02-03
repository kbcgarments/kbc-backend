import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';

export class SendEmailDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  to!: string;

  @IsString({ message: 'Event must be a string' })
  @IsNotEmpty({ message: 'Event type is required' })
  event!: string;

  @IsOptional()
  @IsObject({ message: 'Params must be an object' })
  params?: Record<string, string | number | boolean | null>;
}
