import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreatePetDto {
  @ApiProperty({
    example: 'dogg',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'dog',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: 'bulldog',
  })
  @IsString()
  breed: string;

  @ApiProperty({
    example: 3,
  })
  @IsNumber()
  age: number;

  @ApiProperty({
    example: 'medium',
  })
  @IsEnum(['small', 'medium', 'large'])
  size: 'small' | 'medium' | 'large';

  @IsString()
  @IsOptional()
  specialNeeds?: string;

  @ApiProperty({
    example: 'Dócil',
  })
  @IsString()
  behavior: string;

  @IsString()
  @IsOptional()
  observations?: string;
}
