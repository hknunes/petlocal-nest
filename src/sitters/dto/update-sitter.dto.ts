import {
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PetType, ServiceType } from '@prisma/client';

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

  @ApiProperty({ example: 'Fins de semana' })
  @IsString()
  @IsOptional()
  availability?: string;

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
