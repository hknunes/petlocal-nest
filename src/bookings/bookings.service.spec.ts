import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: {
            pet: { findFirst: jest.fn() },
            sitterProfile: { findUnique: jest.fn() },
            booking: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const ownerId = 1;
    const dto: CreateBookingDto = {
      petId: 10,
      sitterProfileId: 5,
      startDate: '2026-05-01T10:00:00Z',
      endDate: '2026-05-03T10:00:00Z',
    };

    it('should throw BadRequestException when the pet does not belong to the owner', async () => {
      jest.spyOn(prisma.pet, 'findFirst').mockResolvedValue(null);

      await expect(service.create(ownerId, dto)).rejects.toThrow(BadRequestException);
      expect(prisma.sitterProfile.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the sitter profile does not exist', async () => {
      jest.spyOn(prisma.pet, 'findFirst').mockResolvedValue({ id: 10 } as any);
      jest.spyOn(prisma.sitterProfile, 'findUnique').mockResolvedValue(null);

      await expect(service.create(ownerId, dto)).rejects.toThrow(NotFoundException);
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('should create a booking with the correct number of days as totalPrice', async () => {
      jest.spyOn(prisma.pet, 'findFirst').mockResolvedValue({ id: 10 } as any);
      jest.spyOn(prisma.sitterProfile, 'findUnique').mockResolvedValue({ id: 5, pricePerHour: 15 } as any);
      jest.spyOn(prisma.booking, 'create').mockResolvedValue({ id: 1 } as any);

      await service.create(ownerId, dto);

      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalPrice: 2, // 2 days between May 1 and May 3
            ownerId,
            petId: dto.petId,
            sitterProfileId: dto.sitterProfileId,
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should use totalPrice of 1 for same-day bookings', async () => {
      const sameDayDto: CreateBookingDto = {
        ...dto,
        startDate: '2026-05-01T10:00:00Z',
        endDate: '2026-05-01T10:00:00Z',
      };
      jest.spyOn(prisma.pet, 'findFirst').mockResolvedValue({ id: 10 } as any);
      jest.spyOn(prisma.sitterProfile, 'findUnique').mockResolvedValue({ id: 5 } as any);
      jest.spyOn(prisma.booking, 'create').mockResolvedValue({ id: 1 } as any);

      await service.create(ownerId, sameDayDto);

      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalPrice: 1 }),
        }),
      );
    });

    it('should return the created booking', async () => {
      const mockBooking = { id: 1, totalPrice: 2, status: 'PENDING' };
      jest.spyOn(prisma.pet, 'findFirst').mockResolvedValue({ id: 10 } as any);
      jest.spyOn(prisma.sitterProfile, 'findUnique').mockResolvedValue({ id: 5 } as any);
      jest.spyOn(prisma.booking, 'create').mockResolvedValue(mockBooking as any);

      const result = await service.create(ownerId, dto);

      expect(result).toEqual(mockBooking);
    });
  });

  describe('getMyBookings', () => {
    it('should query by sitterProfile.userId when role is SITTER', async () => {
      jest.spyOn(prisma.booking, 'findMany').mockResolvedValue([]);

      await service.getMyBookings(1, 'SITTER');

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sitterProfile: { userId: 1 } },
        }),
      );
    });

    it('should query by ownerId when role is OWNER', async () => {
      jest.spyOn(prisma.booking, 'findMany').mockResolvedValue([]);

      await service.getMyBookings(1, 'OWNER');

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: 1 },
        }),
      );
    });

    it('should return the bookings list', async () => {
      const mockBookings = [{ id: 1 }, { id: 2 }];
      jest.spyOn(prisma.booking, 'findMany').mockResolvedValue(mockBookings as any);

      const result = await service.getMyBookings(1, 'OWNER');

      expect(result).toEqual(mockBookings);
    });
  });

  describe('changeStatus', () => {
    const bookingId = 1;
    const sitterId = 10;
    const mockBooking = {
      id: bookingId,
      status: 'PENDING',
      sitterProfile: { userId: sitterId },
    };

    it('should throw NotFoundException when the booking does not exist', async () => {
      jest.spyOn(prisma.booking, 'findUnique').mockResolvedValue(null);

      await expect(service.changeStatus(bookingId, sitterId, 'COMPLETED')).rejects.toThrow(NotFoundException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the sitter does not own the booking', async () => {
      jest.spyOn(prisma.booking, 'findUnique').mockResolvedValue({
        ...mockBooking,
        sitterProfile: { userId: 99 }, // different sitter
      } as any);

      await expect(service.changeStatus(bookingId, sitterId, 'COMPLETED')).rejects.toThrow(BadRequestException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the status is invalid', async () => {
      jest.spyOn(prisma.booking, 'findUnique').mockResolvedValue(mockBooking as any);

      await expect(service.changeStatus(bookingId, sitterId, 'ACCEPTED' as any)).rejects.toThrow(BadRequestException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('should update the booking with the new status', async () => {
      jest.spyOn(prisma.booking, 'findUnique').mockResolvedValue(mockBooking as any);
      jest.spyOn(prisma.booking, 'update').mockResolvedValue({ ...mockBooking, status: 'CONFIRMED' } as any);

      await service.changeStatus(bookingId, sitterId, 'CONFIRMED' as any);

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });
    });

    it('should return the updated booking', async () => {
      const updatedBooking = { ...mockBooking, status: 'COMPLETED' };
      jest.spyOn(prisma.booking, 'findUnique').mockResolvedValue(mockBooking as any);
      jest.spyOn(prisma.booking, 'update').mockResolvedValue(updatedBooking as any);

      const result = await service.changeStatus(bookingId, sitterId, 'COMPLETED');

      expect(result).toEqual(updatedBooking);
    });
  });
});
