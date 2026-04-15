import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PetType, ServiceType } from '@prisma/client';

export class GetSittersFilterDto {
  @ApiPropertyOptional({ description: 'Cidade do cuidador' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Tipo de animal (ex: Cão)' })
  @IsOptional()
  @IsEnum(PetType)
  animalType?: PetType;

  @ApiPropertyOptional({ description: 'Tipo de serviço (ex: Passeio)' })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional({ description: 'Preço máximo por dia' })
  @IsOptional()
  @Type(() => Number) // Converte string da URL para número
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRating?: number;
}
