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
    console.log('Find all:');
    console.log('ownerId recebido:', ownerId);

    return (await this.prisma.pet.findMany({
      where: ownerId ? { ownerId } : {},
      include: { owner: this.ownerSelect },
    })) as PetWithOwner[];
  }
  async findAllByOwner(ownerId: number): Promise<PetWithOwner[]> {
    console.log('Find all by owner:');
    console.log('ownerId recebido:', ownerId);
    const pets = await this.prisma.pet.findMany({
      where: { ownerId: ownerId },
      include: { owner: this.ownerSelect },
    });

    console.log(pets);

    return pets as PetWithOwner[];
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
    try {
      return await this.prisma.pet.update({
        where: { id },
        data: updatePetDto,
      });
    } catch (e) {
      throw new NotFoundException(`Pet ${id} não encontrado`);
    }
  }

  async remove(id: string) {
    const pet = await this.prisma.pet.findUnique({ where: { id: Number(id) } });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    return this.prisma.pet.delete({ where: { id: Number(id) } });
  }
}
