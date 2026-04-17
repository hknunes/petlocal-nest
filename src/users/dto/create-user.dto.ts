import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    example: 'hk',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'hk',
  })
  @IsString()
  username: string;

  @ApiProperty({
    example: '123456',
  })
  @IsString()
  password: string;

  @ApiProperty({
    example: 'hk@mail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'admin',
  })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
