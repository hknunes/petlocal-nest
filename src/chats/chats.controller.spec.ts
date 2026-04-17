import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { AuthGuard } from '@nestjs/passport';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

const mockUser = { userId: 1, username: 'user', email: 'user@test.com', roles: ['OWNER'] };

class MockJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  }
}

describe('ChatsController (integration)', () => {
  let app: INestApplication;
  let chatsService: ChatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [
        {
          provide: ChatsService,
          useValue: { create: jest.fn() },
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

    chatsService = module.get<ChatsService>(ChatsService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /chats', () => {
    it('should return 400 when the body is empty', async () => {
      return request(app.getHttpServer()).post('/chats').send({}).expect(400);
    });

    it('should return 400 when receiverId is not a positive integer', async () => {
      return request(app.getHttpServer())
        .post('/chats')
        .send({ receiverId: 'abc' })
        .expect(400);
    });

    it('should call chatsService.create with the authenticated userId and receiverId', async () => {
      const mockChat = { id: 1, senderId: mockUser.userId, receiverId: 2 };
      jest.spyOn(chatsService, 'create').mockResolvedValue(mockChat as any);

      await request(app.getHttpServer()).post('/chats').send({ receiverId: 2 }).expect(201);

      expect(chatsService.create).toHaveBeenCalledWith(mockUser.userId, { receiverId: 2 });
    });

    it('should return 201 with the created chat', async () => {
      const mockChat = { id: 1, senderId: mockUser.userId, receiverId: 2 };
      jest.spyOn(chatsService, 'create').mockResolvedValue(mockChat as any);

      const response = await request(app.getHttpServer())
        .post('/chats')
        .send({ receiverId: 2 })
        .expect(201);

      expect(response.body).toEqual(mockChat);
    });

    it('should return 400 when trying to create a chat with yourself', async () => {
      jest.spyOn(chatsService, 'create').mockRejectedValue(
        new BadRequestException('Não pode criar um chat consigo mesmo.'),
      );

      const response = await request(app.getHttpServer())
        .post('/chats')
        .send({ receiverId: mockUser.userId })
        .expect(400);

      expect(response.body.message).toBe('Não pode criar um chat consigo mesmo.');
    });

    it('should return 200 with the existing chat when one already exists', async () => {
      const existingChat = { id: 5, senderId: mockUser.userId, receiverId: 2 };
      jest.spyOn(chatsService, 'create').mockResolvedValue(existingChat as any);

      const response = await request(app.getHttpServer())
        .post('/chats')
        .send({ receiverId: 2 })
        .expect(201);

      expect(response.body).toEqual(existingChat);
    });
  });
});
