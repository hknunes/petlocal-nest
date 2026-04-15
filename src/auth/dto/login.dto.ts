import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'O nome de utilizador da conta',
    example: 'hugo_nunes',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'A palavra-passe da conta',
    example: 'senhaSegura123',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
