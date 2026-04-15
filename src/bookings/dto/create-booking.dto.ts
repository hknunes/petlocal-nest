import { IsInt, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: '2026-04-10T10:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-04-12T10:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty()
  @IsInt()
  sitterProfileId: number;

  @ApiProperty()
  @IsInt()
  petId: number;
}
