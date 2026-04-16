import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SittersService } from './sitters.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSitterDto } from './dto/update-sitter.dto';
import { GetSittersFilterDto } from './dto/get-sitters-filter.dto';
import { PetType, ServiceType } from '@prisma/client';
import { DayOfWeek } from 'src/common/enums/day-of-week.enum';

describe('SittersService', () => {
  let service: SittersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SittersService,
        {
          provide: PrismaService,
          useValue: {
            sitterProfile: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
              findMany: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SittersService>(SittersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateSitterProfile', () => {
    const userId = 1;
    const baseDto: UpdateSitterDto = {
      services: [ServiceType.HOME_VISIT],
      pricePerHour: 20,
      radiusKm: 10,
      acceptedAnimals: [PetType.DOG],
      atSitterHome: true,
      atOwnerHome: false,
    };

    it('should upsert the profile without availability when not provided', async () => {
      const mockProfile = { id: 1, userId, ...baseDto };
      jest.spyOn(prisma.sitterProfile, 'upsert').mockResolvedValue(mockProfile as any);

      const result = await service.updateSitterProfile(userId, baseDto);

      expect(prisma.sitterProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: expect.not.objectContaining({ availability: expect.anything() }),
        create: expect.objectContaining({ userId }),
      });
      expect(result).toEqual(mockProfile);
    });

    it('should convert availability days array to a bitmask before upserting', async () => {
      const dto: UpdateSitterDto = { ...baseDto, availability: [DayOfWeek.Monday, DayOfWeek.Wednesday] };
      jest.spyOn(prisma.sitterProfile, 'upsert').mockResolvedValue({} as any);

      await service.updateSitterProfile(userId, dto);

      const expectedMask = DayOfWeek.Monday | DayOfWeek.Wednesday; // 5
      expect(prisma.sitterProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ availability: expectedMask }),
          create: expect.objectContaining({ availability: expectedMask }),
        }),
      );
    });
  });

  describe('getSitterProfile', () => {
    it('should return the profile when found', async () => {
      const mockProfile = { id: 1, userId: 1, user: { username: 'john', email: 'john@example.com' } };
      jest.spyOn(prisma.sitterProfile, 'findUnique').mockResolvedValue(mockProfile as any);

      const result = await service.getSitterProfile(1);

      expect(prisma.sitterProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: { user: { select: { username: true, email: true } } },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should throw NotFoundException when the profile does not exist', async () => {
      jest.spyOn(prisma.sitterProfile, 'findUnique').mockResolvedValue(null);

      await expect(service.getSitterProfile(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteSitterProfile', () => {
    const userId = 1;

    it('should throw NotFoundException when the user does not exist', async () => {
      const tx = {
        user: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
        sitterProfile: { delete: jest.fn() },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation((cb: any) => cb(tx));

      await expect(service.deleteSitterProfile(userId)).rejects.toThrow(NotFoundException);
      expect(tx.sitterProfile.delete).not.toHaveBeenCalled();
    });

    it('should delete the profile and remove the SITTER role from the user', async () => {
      const mockUser = { roles: ['OWNER', 'SITTER'] };
      const updatedUser = { id: userId, roles: ['OWNER'] };
      const tx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue(updatedUser),
        },
        sitterProfile: { delete: jest.fn().mockResolvedValue({}) },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation((cb: any) => cb(tx));

      const result = await service.deleteSitterProfile(userId);

      expect(tx.sitterProfile.delete).toHaveBeenCalledWith({ where: { userId } });
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { roles: ['OWNER'] },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('findAll', () => {
    it('should return all sitters with no filters', async () => {
      const mockSitters = [{ id: 1 }, { id: 2 }];
      jest.spyOn(prisma.sitterProfile, 'findMany').mockResolvedValue(mockSitters as any);

      const result = await service.findAll({});

      expect(result).toEqual(mockSitters);
    });

    it('should apply location filter', async () => {
      jest.spyOn(prisma.sitterProfile, 'findMany').mockResolvedValue([]);

      await service.findAll({ location: 'Lisboa' } as GetSittersFilterDto);

      expect(prisma.sitterProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { location: { contains: 'Lisboa', mode: 'insensitive' } },
          }),
        }),
      );
    });

    it('should apply maxPrice filter', async () => {
      jest.spyOn(prisma.sitterProfile, 'findMany').mockResolvedValue([]);

      await service.findAll({ maxPrice: 30 } as GetSittersFilterDto);

      expect(prisma.sitterProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pricePerHour: { lte: 30 } }),
        }),
      );
    });

    it('should apply animalType filter', async () => {
      jest.spyOn(prisma.sitterProfile, 'findMany').mockResolvedValue([]);

      await service.findAll({ animalType: PetType.CAT } as GetSittersFilterDto);

      expect(prisma.sitterProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ acceptedAnimals: { has: PetType.CAT } }),
        }),
      );
    });

    it('should apply serviceType filter', async () => {
      jest.spyOn(prisma.sitterProfile, 'findMany').mockResolvedValue([]);

      await service.findAll({ serviceType: ServiceType.ACCOMODATION } as GetSittersFilterDto);

      expect(prisma.sitterProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ services: { has: ServiceType.ACCOMODATION } }),
        }),
      );
    });
  });
});
