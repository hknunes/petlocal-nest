import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(role?: UserRole): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: role ? { roles: { has: role } } : {},
    });

    if (role && users.length === 0) {
      throw new NotFoundException(
        `Nenhum utilizador com a role '${role}' encontrado.`,
      );
    }

    return users;
  }

  async findOne(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findOneById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: Number(id) },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(dto: CreateUserDto) {
    const newUser = await this.prisma.user.create({
      data: {
        name: dto.name || dto.username,
        email: dto.email,
        username: dto.username,
        password: dto.password, // Assume-se que já vem com hash do AuthService
        roles: dto.roles,
      },
    });
    const { password, ...result } = newUser;
    return result;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: Number(id) },
        data: { ...updateUserDto },
      });

      const { password, ...result } = updatedUser;
      return result;
    } catch {
      throw new NotFoundException(`Utilizador com ID ${id} não encontrado.`);
    }
  }

  async updatePassword(userId: number, passwordHash: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });
  }

  async delete(id: number) {
    try {
      const deletedUser = await this.prisma.user.delete({
        where: { id: Number(id) },
      });

      const { password, ...result } = deletedUser;
      return result;
    } catch {
      throw new NotFoundException(
        `Não foi possível eliminar: ID ${id} não existe.`,
      );
    }
  }
}
