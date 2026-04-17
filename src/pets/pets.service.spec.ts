import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PetsService } from './pets.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PetType } from '@prisma/client';

describe('PetsService', () => {
  let service: PetsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetsService,
        {
          provide: PrismaService,
          useValue: {
            pet: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PetsService>(PetsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const ownerId = 1;
    const dto: CreatePetDto = {
      name: 'Rex',
      type: PetType.DOG,
      breed: 'Bulldog',
      age: 3,
      size: 'medium',
      behavior: 'Dócil',
      ownerId,
    };

    it('should create a pet with the correct data and ownerId', async () => {
      jest.spyOn(prisma.pet, 'create').mockResolvedValue({ id: 1 } as any);

      await service.create(dto, ownerId);

      expect(prisma.pet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ...dto, ownerId }),
          include: expect.any(Object),
        }),
      );
    });

    it('should return the created pet', async () => {
      const mockPet = { id: 1, name: 'Rex', ownerId };
      jest.spyOn(prisma.pet, 'create').mockResolvedValue(mockPet as any);

      const result = await service.create(dto, ownerId);

      expect(result).toEqual(mockPet);
    });
  });

  describe('findAll', () => {
    it('should query all pets when no ownerId is provided', async () => {
      jest.spyOn(prisma.pet, 'findMany').mockResolvedValue([]);

      await service.findAll();

      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should filter pets by ownerId when provided', async () => {
      jest.spyOn(prisma.pet, 'findMany').mockResolvedValue([]);

      await service.findAll(1);

      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: 1 } }),
      );
    });

    it('should return the list of pets', async () => {
      const mockPets = [{ id: 1 }, { id: 2 }];
      jest.spyOn(prisma.pet, 'findMany').mockResolvedValue(mockPets as any);

      const result = await service.findAll();

      expect(result).toEqual(mockPets);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the pet does not exist', async () => {
      jest.spyOn(prisma.pet, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('should return the pet when found', async () => {
      const mockPet = { id: 1, name: 'Rex' };
      jest.spyOn(prisma.pet, 'findUnique').mockResolvedValue(mockPet as any);

      const result = await service.findOne(1);

      expect(result).toEqual(mockPet);
    });

    it('should query by the correct id', async () => {
      jest.spyOn(prisma.pet, 'findUnique').mockResolvedValue({ id: 1 } as any);

      await service.findOne(1);

      expect(prisma.pet.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdatePetDto = { name: 'Max' };

    it('should call prisma.pet.update with the correct id and data', async () => {
      jest.spyOn(prisma.pet, 'update').mockResolvedValue({ id: 1, name: 'Max' } as any);

      await service.update(1, updateDto);

      expect(prisma.pet.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
    });

    it('should return the updated pet', async () => {
      const updatedPet = { id: 1, name: 'Max' };
      jest.spyOn(prisma.pet, 'update').mockResolvedValue(updatedPet as any);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedPet);
    });
  });

  describe('delete', () => {
    const petId = 1;
    const ownerId = 10;
    const mockPet = { id: petId, ownerId };

    it('should throw NotFoundException when the pet does not exist or does not belong to the owner', async () => {
      jest.spyOn(prisma.pet, 'findFirst').mockResolvedValue(null);

      await expect(service.delete(petId, ownerId)).rejects.toThrow(NotFoundException);
      expect(prisma.pet.delete).not.toHaveBeenCalled();
    });

    it('should delete the pet when it belongs to the owner', async () => {
      jest.spyOn(prisma.pet, 'findFirst').mockResolvedValue(mockPet as any);
      jest.spyOn(prisma.pet, 'delete').mockResolvedValue(mockPet as any);

      await service.delete(petId, ownerId);

      expect(prisma.pet.delete).toHaveBeenCalledWith({ where: { id: petId } });
    });

    it('should return the deleted pet', async () => {
      jest.spyOn(prisma.pet, 'findFirst').mockResolvedValue(mockPet as any);
      jest.spyOn(prisma.pet, 'delete').mockResolvedValue(mockPet as any);

      const result = await service.delete(petId, ownerId);

      expect(result).toEqual(mockPet);
    });
  });
});
