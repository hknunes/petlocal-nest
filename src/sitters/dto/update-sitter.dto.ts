import {
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PetType, ServiceType } from '@prisma/client';
import { DayOfWeek } from 'src/common/enums/day-of-week.enum';

export class UpdateSitterDto {
  @ApiProperty({ example: ['EXCURSIONS', 'ACCOMODATION'], isArray: true })
  @IsArray()
  services: ServiceType[];

  @ApiProperty({ example: 15.5 })
  @IsNumber()
  pricePerHour: number;

  @ApiProperty({ example: 10, description: 'Raio em KM' })
  @IsNumber()
  radiusKm: number;

  @ApiProperty({ example: ['DOG', 'CAT'] })
  @IsArray()
  acceptedAnimals: PetType[];

  @ApiProperty({ example: [1, 2, 4], description: 'Array de dias da semana (1=Segunda, 2=Terça, 4=Quarta, etc.)' })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @Transform(({ value }: { value: DayOfWeek[] }) =>
    value.reduce((mask, day) => mask | day, 0)
  )
  availability?: number; // stored as bitmask after transform

  @ApiProperty({ example: '5 anos a cuidar de cães' })
  @IsString()
  @IsOptional()
  experience?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  atSitterHome: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  atOwnerHome: boolean;
}
