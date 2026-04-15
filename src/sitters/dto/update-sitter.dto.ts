import {
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSitterDto {
  @ApiProperty({ example: ['Passeio', 'Alojamento'], isArray: true })
  @IsArray()
  services: string[];

  @ApiProperty({ example: 15.5 })
  @IsNumber()
  pricePerHour: number;

  @ApiProperty({ example: 10, description: 'Raio em KM' })
  @IsNumber()
  radiusKm: number;

  @ApiProperty({ example: ['Cão', 'Gato'] })
  @IsArray()
  acceptedAnimals: string[];

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
