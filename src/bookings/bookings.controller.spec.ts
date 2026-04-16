import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AuthGuard } from '@nestjs/passport';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

const mockOwner = { userId: 1, username: 'owner', email: 'owner@test.com', roles: ['OWNER'] };
const mockSitter = { userId: 2, username: 'sitter', email: 'sitter@test.com', roles: ['OWNER', 'SITTER'] };

let activeUser = mockOwner;

class MockJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = activeUser;
    return true;
  }
}

describe('BookingsController (integration)', () => {
  let app: INestApplication;
  let bookingsService: BookingsService;

  beforeEach(async () => {
    activeUser = mockOwner;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: { create: jest.fn(), getMyBookings: jest.fn() },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(MockJwtGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    bookingsService = module.get<BookingsService>(BookingsService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /bookings', () => {
    const validDto = {
      petId: 10,
      sitterProfileId: 5,
      startDate: '2026-05-01T10:00:00Z',
      endDate: '2026-05-03T10:00:00Z',
    };

    it('should return 400 when the body is empty', async () => {
      return request(app.getHttpServer()).post('/bookings').send({}).expect(400);
    });

    it('should return 400 when petId is not an integer', async () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .send({ ...validDto, petId: 'abc' })
        .expect(400);
    });

    it('should return 400 when startDate is not a valid date string', async () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .send({ ...validDto, startDate: 'not-a-date' })
        .expect(400);
    });

    it('should call bookingsService.create with the authenticated userId and dto', async () => {
      jest.spyOn(bookingsService, 'create').mockResolvedValue({ id: 1 } as any);

      await request(app.getHttpServer()).post('/bookings').send(validDto).expect(201);

      expect(bookingsService.create).toHaveBeenCalledWith(mockOwner.userId, validDto);
    });

    it('should return 201 with the created booking', async () => {
      const mockBooking = { id: 1, status: 'PENDING', totalPrice: 2 };
      jest.spyOn(bookingsService, 'create').mockResolvedValue(mockBooking as any);

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .send(validDto)
        .expect(201);

      expect(response.body).toEqual(mockBooking);
    });
  });

  describe('GET /bookings/my-requests', () => {
    it('should call getMyBookings with OWNER role for a user without SITTER role', async () => {
      jest.spyOn(bookingsService, 'getMyBookings').mockResolvedValue([]);

      await request(app.getHttpServer()).get('/bookings/my-requests').expect(200);

      expect(bookingsService.getMyBookings).toHaveBeenCalledWith(mockOwner.userId, 'OWNER');
    });

    it('should call getMyBookings with SITTER role for a user with SITTER role', async () => {
      activeUser = mockSitter;
      jest.spyOn(bookingsService, 'getMyBookings').mockResolvedValue([]);

      await request(app.getHttpServer()).get('/bookings/my-requests').expect(200);

      expect(bookingsService.getMyBookings).toHaveBeenCalledWith(mockSitter.userId, 'SITTER');
    });

    it('should return 200 with the bookings list', async () => {
      const mockBookings = [{ id: 1 }, { id: 2 }];
      jest.spyOn(bookingsService, 'getMyBookings').mockResolvedValue(mockBookings as any);

      const response = await request(app.getHttpServer())
        .get('/bookings/my-requests')
        .expect(200);

      expect(response.body).toEqual(mockBookings);
    });
  });
});
