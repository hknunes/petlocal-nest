import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';

const mockUser = {
  id: 1,
  name: 'Test User',
  username: 'testuser',
  email: 'test@mail.com',
  roles: [UserRole.OWNER],
};

describe('UsersController (integration)', () => {
  let app: INestApplication;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findOneById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /users', () => {
    it('should call findAll without a role when no query param is provided', async () => {
      jest.spyOn(usersService, 'findAll').mockResolvedValue([]);

      await request(app.getHttpServer()).get('/users').expect(200);

      expect(usersService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should call findAll with the role query param', async () => {
      jest.spyOn(usersService, 'findAll').mockResolvedValue([mockUser] as any);

      await request(app.getHttpServer()).get(`/users?role=${UserRole.OWNER}`).expect(200);

      expect(usersService.findAll).toHaveBeenCalledWith(UserRole.OWNER);
    });

    it('should return 200 with the list of users', async () => {
      jest.spyOn(usersService, 'findAll').mockResolvedValue([mockUser] as any);

      const response = await request(app.getHttpServer()).get('/users').expect(200);

      expect(response.body).toEqual([mockUser]);
    });

    it('should return 404 when no users with the given role exist', async () => {
      jest.spyOn(usersService, 'findAll').mockRejectedValue(
        new NotFoundException(`Nenhum utilizador com a role '${UserRole.SITTER}' encontrado.`),
      );

      return request(app.getHttpServer()).get(`/users?role=${UserRole.SITTER}`).expect(404);
    });
  });

  describe('GET /users/:id', () => {
    it('should return 400 when id is not a number', async () => {
      return request(app.getHttpServer()).get('/users/abc').expect(400);
    });

    it('should call findOneById with the parsed id', async () => {
      jest.spyOn(usersService, 'findOneById').mockResolvedValue(mockUser as any);

      await request(app.getHttpServer()).get('/users/1').expect(200);

      expect(usersService.findOneById).toHaveBeenCalledWith(1);
    });

    it('should return 200 with the user', async () => {
      jest.spyOn(usersService, 'findOneById').mockResolvedValue(mockUser as any);

      const response = await request(app.getHttpServer()).get('/users/1').expect(200);

      expect(response.body).toEqual(mockUser);
    });

    it('should return 404 when the user does not exist', async () => {
      jest.spyOn(usersService, 'findOneById').mockRejectedValue(
        new NotFoundException('Utilizador não encontrado.'),
      );

      return request(app.getHttpServer()).get('/users/99').expect(404);
    });
  });

  describe('POST /users', () => {
    const validDto = {
      name: 'Test User',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'password123',
      roles: [UserRole.OWNER],
    };

    it('should return 400 when body is empty', async () => {
      return request(app.getHttpServer()).post('/users').send({}).expect(400);
    });

    it('should return 400 when email is invalid', async () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...validDto, email: 'not-an-email' })
        .expect(400);
    });

    it('should return 400 when roles contains an invalid value', async () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ ...validDto, roles: ['INVALID'] })
        .expect(400);
    });

    it('should call usersService.create with the dto', async () => {
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser as any);

      await request(app.getHttpServer()).post('/users').send(validDto).expect(201);

      expect(usersService.create).toHaveBeenCalledWith(expect.objectContaining({ username: validDto.username }));
    });

    it('should return 201 with the created user', async () => {
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser as any);

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(validDto)
        .expect(201);

      expect(response.body).toEqual(mockUser);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should return 400 when id is not a number', async () => {
      return request(app.getHttpServer()).patch('/users/abc').send({ name: 'New Name' }).expect(400);
    });

    it('should call usersService.update with the parsed id and dto', async () => {
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser as any);

      await request(app.getHttpServer()).patch('/users/1').send({ name: 'New Name' }).expect(200);

      expect(usersService.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'New Name' }));
    });

    it('should return 200 with the updated user', async () => {
      const updated = { ...mockUser, name: 'New Name' };
      jest.spyOn(usersService, 'update').mockResolvedValue(updated as any);

      const response = await request(app.getHttpServer())
        .patch('/users/1')
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body).toEqual(updated);
    });

    it('should return 404 when the user does not exist', async () => {
      jest.spyOn(usersService, 'update').mockRejectedValue(
        new NotFoundException('Utilizador com ID 99 não encontrado.'),
      );

      return request(app.getHttpServer()).patch('/users/99').send({ name: 'New Name' }).expect(404);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should return 400 when id is not a number', async () => {
      return request(app.getHttpServer()).delete('/users/abc').expect(400);
    });

    it('should call usersService.delete with the parsed id', async () => {
      jest.spyOn(usersService, 'delete').mockResolvedValue(mockUser as any);

      await request(app.getHttpServer()).delete('/users/1').expect(200);

      expect(usersService.delete).toHaveBeenCalledWith(1);
    });

    it('should return 200 with the deleted user', async () => {
      jest.spyOn(usersService, 'delete').mockResolvedValue(mockUser as any);

      const response = await request(app.getHttpServer()).delete('/users/1').expect(200);

      expect(response.body).toEqual(mockUser);
    });

    it('should return 404 when the user does not exist', async () => {
      jest.spyOn(usersService, 'delete').mockRejectedValue(
        new NotFoundException('Não foi possível eliminar: ID 99 não existe.'),
      );

      return request(app.getHttpServer()).delete('/users/99').expect(404);
    });
  });
});
