import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetSittersFilterDto {
  @ApiPropertyOptional({ description: 'Cidade do cuidador' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Tipo de animal (ex: Cão)' })
  @IsOptional()
  @IsString()
  animalType?: string;

  @ApiPropertyOptional({ description: 'Tipo de serviço (ex: Passeio)' })
  @IsOptional()
  @IsString()
  serviceType?: string;

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
