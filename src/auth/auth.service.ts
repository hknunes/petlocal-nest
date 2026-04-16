import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface TokenPayload {
  sub: number;
  username: string;
  roles: UserRole[];
}

interface ResetPayload {
  sub: number;
  type: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async login(
    username: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(username);

    console.log(user);

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    const isMatch = await bcrypt.compare(pass, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: TokenPayload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(registerDto: RegisterDto) {

    let existingUser = await this.usersService.findOne(registerDto.username);
    if (existingUser) {
      throw new ConflictException('Este username já está em utilização');
    }

    existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Este email já está em utilização');
    }
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: registerDto.name || registerDto.username,
          email: registerDto.email,
          username: registerDto.username,
          password: hashedPassword,
          roles: registerDto.roles,
        },
      });

      if (registerDto.roles.includes('SITTER')) {
        await tx.sitterProfile.create({
          data: {
            userId: user.id,
            pricePerHour: 0,
            radiusKm: 10, // Default 10km
            services: [],
          },
        });
      }

      return user;
    });

    const payload = {
      sub: newUser.id,
      username: newUser.username,
      roles: newUser.roles,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: newUser.id,
        email: newUser.email,
        roles: newUser.roles,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Por segurança, podes dizer que o email foi enviado mesmo que não exista
      throw new NotFoundException('Utilizador não encontrado');
    }

    // Gerar token de 15 minutos
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'reset' },
      { expiresIn: '15m' },
    );

    // TODO: Enviar email real com o mailerService
    console.log(
      `Link de recuperação: http://localhost:3000/auth/reset-password?token=${resetToken}`,
    );

    return {
      message: 'Se o email existir, um link de recuperação foi enviado.',
    };
  }

  async resetPassword(
    token: string,
    newPass: string,
  ): Promise<{ message: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<ResetPayload>(token);

      if (payload.type !== 'reset') {
        throw new UnauthorizedException('Token inválido');
      }

      const hashedPassword = await bcrypt.hash(newPass, 10);
      await this.usersService.update(payload.sub, { password: hashedPassword });

      return { message: 'Password atualizada com sucesso!' };
    } catch (error) {
      throw new UnauthorizedException(error);
    }
  }
}
