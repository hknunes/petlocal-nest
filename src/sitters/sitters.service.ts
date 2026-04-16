import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSitterDto } from './dto/update-sitter.dto';
import { GetSittersFilterDto } from './dto/get-sitters-filter.dto';

@Injectable()
export class SittersService {
  constructor(private prisma: PrismaService) {}

  async updateSitterProfile(userId: number, updateSitterDto: UpdateSitterDto) {
    const { availability, ...rest } = updateSitterDto;
    const availabilityMask = availability
      ? availability.reduce((mask, day) => mask | day, 0)
      : undefined;

    return await this.prisma.sitterProfile.upsert({
      where: { userId: Number(userId) },
      update: { ...rest, ...(availabilityMask !== undefined && { availability: availabilityMask }) },
      create: {
        userId: Number(userId),
        ...rest,
        ...(availabilityMask !== undefined && { availability: availabilityMask }),
      },
    });
  }

  async getSitterProfile(userId: number) {
    const profile = await this.prisma.sitterProfile.findUnique({
      where: { userId: Number(userId) },
      include: { user: { select: { username: true, email: true } } },
    });
    if (!profile)
      throw new NotFoundException('Perfil de cuidador não encontrado');
    return profile;
  }

  async deleteSitterProfile(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Procuramos o utilizador para obter as roles atuais
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { roles: true },
      });

      if (!user) throw new NotFoundException('Utilizador não encontrado.');

      await tx.sitterProfile.delete({
        where: { userId },
      });

      const updatedRoles = user.roles.filter((role) => role !== 'SITTER');

      return tx.user.update({
        where: { id: userId },
        data: { roles: updatedRoles },
      });
    });
  }

  async findAll(filters: GetSittersFilterDto) {
    const { location, animalType, serviceType, maxPrice, minRating } = filters;

    return this.prisma.sitterProfile.findMany({
      where: {
        user: location
          ? { location: { contains: location, mode: 'insensitive' } }
          : undefined,

        // Filtro de Preço
        pricePerHour: maxPrice ? { lte: maxPrice } : undefined,

        // Filtro de Arrays (Verifica se o tipo existe dentro do array da BD)
        acceptedAnimals: animalType ? { has: animalType } : undefined,
        services: serviceType ? { has: serviceType } : undefined,

        // Filtro de Avaliação (Se tiveres a tabela de Reviews)
        // rating: rating ? minRating ? { gte: minRating } : undefined,
      },
      include: {
        user: {
          select: { username: true, location: true, photo: true },
        },
      },
    });
  }
}
