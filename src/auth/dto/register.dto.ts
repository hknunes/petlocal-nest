import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MinLength,
  IsString,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({
    example: 'Hugo Nunes',
    description: 'Nome completo do utilizador',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name: string;

  @ApiProperty({
    example: 'hugo_nunes',
    description: 'Nome de utilizador único para login',
  })
  @IsString()
  @IsNotEmpty({ message: 'O username é obrigatório' })
  username: string;

  @ApiProperty({
    example: 'hugo@exemplo.com',
    description: 'Email para contacto e recuperação',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    example: 'senhaSegura123',
    description: 'Mínimo de 6 caracteres',
  })
  @MinLength(6, { message: 'A password deve ter pelo menos 6 caracteres' })
  password: string;

  @ApiProperty({
    example: [UserRole.OWNER, UserRole.SITTER],
    enum: UserRole,
    isArray: true,
    description: 'Perfil do utilizador: OWNER, SITTER ou ambos',
  })
  @IsArray()
  @IsEnum(UserRole, {
    each: true,
    message: 'O perfil deve ser OWNER ou SITTER',
  })
  roles: UserRole[];
}
