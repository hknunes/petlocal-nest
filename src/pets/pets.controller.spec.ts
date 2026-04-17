import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AuthGuard } from '@nestjs/passport';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';
import { PetType } from '@prisma/client';

const mockUser = { userId: 1, username: 'owner', email: 'owner@test.com', roles: ['OWNER'] };

class MockJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  }
}

describe('PetsController (integration)', () => {
  let app: INestApplication;
  let petsService: PetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PetsController],
      providers: [
        {
          provide: PetsService,
          useValue: { create: jest.fn(), findAll: jest.fn() },
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

    petsService = module.get<PetsService>(PetsService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /pets', () => {
    const validDto = {
      name: 'Rex',
      type: PetType.DOG,
      breed: 'Bulldog',
      age: 3,
      size: 'medium',
      behavior: 'Dócil',
      ownerId: 1,
    };

    it('should return 400 when the body is empty', async () => {
      return request(app.getHttpServer()).post('/pets').send({}).expect(400);
    });

    it('should return 400 when type is not a valid PetType', async () => {
      return request(app.getHttpServer())
        .post('/pets')
        .send({ ...validDto, type: 'DRAGON' })
        .expect(400);
    });

    it('should return 400 when size is not valid', async () => {
      return request(app.getHttpServer())
        .post('/pets')
        .send({ ...validDto, size: 'giant' })
        .expect(400);
    });

    it('should call petsService.create with the dto and authenticated userId', async () => {
      jest.spyOn(petsService, 'create').mockResolvedValue({ id: 1 } as any);

      await request(app.getHttpServer()).post('/pets').send(validDto).expect(201);

      expect(petsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: validDto.name }),
        mockUser.userId,
      );
    });

    it('should return 201 with the created pet', async () => {
      const mockPet = { id: 1, ...validDto };
      jest.spyOn(petsService, 'create').mockResolvedValue(mockPet as any);

      const response = await request(app.getHttpServer())
        .post('/pets')
        .send(validDto)
        .expect(201);

      expect(response.body).toEqual(mockPet);
    });
  });

  describe('GET /pets', () => {
    it('should call petsService.findAll without ownerId when no query param is provided', async () => {
      jest.spyOn(petsService, 'findAll').mockResolvedValue([]);

      await request(app.getHttpServer()).get('/pets').expect(200);

      expect(petsService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should call petsService.findAll with the parsed ownerId query param', async () => {
      jest.spyOn(petsService, 'findAll').mockResolvedValue([]);

      await request(app.getHttpServer()).get('/pets?ownerId=1').expect(200);

      expect(petsService.findAll).toHaveBeenCalledWith(1);
    });

    it('should return 400 when ownerId is not a number', async () => {
      return request(app.getHttpServer()).get('/pets?ownerId=abc').expect(400);
    });

    it('should return 200 with the list of pets', async () => {
      const mockPets = [{ id: 1, name: 'Rex' }, { id: 2, name: 'Max' }];
      jest.spyOn(petsService, 'findAll').mockResolvedValue(mockPets as any);

      const response = await request(app.getHttpServer()).get('/pets').expect(200);

      expect(response.body).toEqual(mockPets);
    });
  });
});
