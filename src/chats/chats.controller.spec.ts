import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import request from 'supertest';
import { AuthGuard } from '@nestjs/passport';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

const mockUser = {
  userId: 1,
  username: 'user',
  email: 'user@test.com',
  roles: ['OWNER'],
};

class MockJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user: typeof mockUser }>();
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
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(MockJwtGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
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
      const createSpy = jest
        .spyOn(chatsService, 'create')
        .mockResolvedValue(mockChat as any);

      await request(app.getHttpServer())
        .post('/chats')
        .send({ receiverId: 2 })
        .expect(201);

      expect(createSpy).toHaveBeenCalledWith(mockUser.userId, {
        receiverId: 2,
      });
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
      jest
        .spyOn(chatsService, 'create')
        .mockRejectedValue(
          new BadRequestException('Não pode criar um chat consigo mesmo.'),
        );

      const response = await request(app.getHttpServer())
        .post('/chats')
        .send({ receiverId: mockUser.userId })
        .expect(400);

      expect((response.body as { message: string }).message).toBe(
        'Não pode criar um chat consigo mesmo.',
      );
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

  describe('GET /chats', () => {
    it('should call chatsService.findAll with the authenticated userId', async () => {
      const findAllSpy = jest
        .spyOn(chatsService, 'findAll')
        .mockResolvedValue([]);

      await request(app.getHttpServer()).get('/chats').expect(200);

      expect(findAllSpy).toHaveBeenCalledWith(mockUser.userId);
    });

    it('should return 200 with the list of chats', async () => {
      const mockChats = [
        { id: 1, senderId: mockUser.userId, receiverId: 2 },
        { id: 2, senderId: 3, receiverId: mockUser.userId },
      ];
      jest.spyOn(chatsService, 'findAll').mockResolvedValue(mockChats as any);

      const response = await request(app.getHttpServer())
        .get('/chats')
        .expect(200);

      expect(response.body).toEqual(mockChats);
    });
  });

  describe('GET /chats/:id', () => {
    it('should return 400 when id is not a number', async () => {
      return request(app.getHttpServer()).get('/chats/abc').expect(400);
    });

    it('should call chatsService.findOne with the chat id', async () => {
      const mockChat = { id: 1, senderId: mockUser.userId, receiverId: 2 };
      const findOneSpy = jest
        .spyOn(chatsService, 'findOne')
        .mockResolvedValue(mockChat as any);

      await request(app.getHttpServer()).get('/chats/1').expect(200);

      expect(findOneSpy).toHaveBeenCalledWith(1);
    });

    it('should return 200 with the chat', async () => {
      const mockChat = { id: 1, senderId: mockUser.userId, receiverId: 2 };
      jest.spyOn(chatsService, 'findOne').mockResolvedValue(mockChat as any);

      const response = await request(app.getHttpServer())
        .get('/chats/1')
        .expect(200);

      expect(response.body).toEqual(mockChat);
    });

    it('should return 404 when the chat does not exist', async () => {
      jest
        .spyOn(chatsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Chat não encontrado.'));

      const response = await request(app.getHttpServer())
        .get('/chats/99')
        .expect(404);

      expect((response.body as { message: string }).message).toBe(
        'Chat não encontrado.',
      );
    });
  });

  describe('DELETE /chats/:id', () => {
    it('should return 400 when id is not a number', async () => {
      return request(app.getHttpServer()).delete('/chats/abc').expect(400);
    });

    it('should call chatsService.delete with id and authenticated userId', async () => {
      const mockChat = { id: 1, senderId: mockUser.userId, receiverId: 2 };
      const deleteSpy = jest
        .spyOn(chatsService, 'delete')
        .mockResolvedValue(mockChat as any);

      await request(app.getHttpServer()).delete('/chats/1').expect(200);

      expect(deleteSpy).toHaveBeenCalledWith(1, mockUser.userId);
    });

    it('should return 200 with the deleted chat', async () => {
      const mockChat = { id: 1, senderId: mockUser.userId, receiverId: 2 };
      jest.spyOn(chatsService, 'delete').mockResolvedValue(mockChat as any);

      const response = await request(app.getHttpServer())
        .delete('/chats/1')
        .expect(200);

      expect(response.body).toEqual(mockChat);
    });

    it('should return 403 when the user is not a participant', async () => {
      jest
        .spyOn(chatsService, 'delete')
        .mockRejectedValue(
          new ForbiddenException('Não tem permissão para apagar este chat.'),
        );

      const response = await request(app.getHttpServer())
        .delete('/chats/1')
        .expect(403);

      expect((response.body as { message: string }).message).toBe(
        'Não tem permissão para apagar este chat.',
      );
    });

    it('should return 404 when the chat does not exist', async () => {
      jest
        .spyOn(chatsService, 'delete')
        .mockRejectedValue(new NotFoundException('Chat não encontrado.'));

      const response = await request(app.getHttpServer())
        .delete('/chats/99')
        .expect(404);

      expect((response.body as { message: string }).message).toBe(
        'Chat não encontrado.',
      );
    });
  });
});
