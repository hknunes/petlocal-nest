import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsInt } from 'class-validator';
import { PetType } from '@prisma/client';

export class CreatePetDto {
  @ApiProperty({
    example: 'dogg',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'dog',
  })
  @IsEnum(PetType)
  type: PetType;

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

  @ApiProperty()
  @IsInt()
  ownerId: number;
}
