import { IsString } from 'class-validator';

export class TrackOrderDto {
  @IsString()
  orderNumber!: string;
}
