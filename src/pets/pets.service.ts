import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePetDto } from './dto/create-pet.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdatePetDto } from './dto/update-pet.dto';

// 1. Criamos um tipo para o retorno que inclui o dono sem a password
type PetWithOwner = Prisma.PetGetPayload<{
  include: { owner: { select: { id: true; username: true; email: true } } };
}>;

@Injectable()
export class PetsService {
  constructor(private prisma: PrismaService) {}

  // Definimos o que queremos selecionar do dono para reutilizar
  private readonly ownerSelect = {
    select: {
      id: true,
      username: true,
      email: true,
    },
  };

  async create(dto: CreatePetDto, ownerId: number): Promise<PetWithOwner> {
    return await this.prisma.pet.create({
      data: {
        ...dto,
        ownerId: Number(ownerId),
      },
      include: { owner: this.ownerSelect },
    });
  }

  async findAll(ownerId?: number): Promise<PetWithOwner[]> {
    return (await this.prisma.pet.findMany({
      where: ownerId ? { ownerId: Number(ownerId) } : {},
      include: { owner: this.ownerSelect },
    })) as PetWithOwner[];
  }

  async findOne(id: number): Promise<PetWithOwner> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: Number(id) },
      include: { owner: this.ownerSelect },
    });

    if (!pet) throw new NotFoundException('Pet não encontrado');

    return pet as PetWithOwner;
  }

  async update(id: number, updatePetDto: UpdatePetDto) {
    return this.prisma.pet.update({
      where: { id: Number(id) },
      data: updatePetDto,
    });
  }

  async delete(id: number, ownerId: number) {
    const pet = await this.prisma.pet.findFirst({
      where: { id: Number(id), ownerId: Number(ownerId) },
    });

    if (!pet)
      throw new NotFoundException(
        'Pet não encontrado ou não pertence a este utilizador',
      );

    return this.prisma.pet.delete({ where: { id: pet.id } });
  }
}
