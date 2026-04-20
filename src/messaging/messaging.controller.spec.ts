import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { AuthGuard } from '@nestjs/passport';
import { Server } from 'socket.io';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { ChatsService } from '../chats/chats.service';
import { MessagesService } from '../messages/messages.service';

const mockUser = {
  userId: 1,
  username: 'testuser',
  email: 'test@mail.com',
  roles: ['OWNER'],
};

const mockChat = { id: 1, senderId: 1, receiverId: 2, messages: [] };
const mockMessage = {
  id: 10,
  senderId: 1,
  receiverId: 2,
  chatId: 1,
  message: 'Olá!',
};

class MockJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user: typeof mockUser }>();
    req.user = mockUser;
    return true;
  }
}

describe('MessagingController (integration)', () => {
  let app: INestApplication;
  let chatsService: ChatsService;
  let messagesService: MessagesService;
  let gateway: MessagingGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
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
        {
          provide: MessagesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: MessagingGateway,
          useValue: {
            server: {
              to: jest.fn().mockReturnValue({ emit: jest.fn() }),
            } as unknown as Server,
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
    messagesService = module.get<MessagesService>(MessagesService);
    gateway = module.get<MessagingGateway>(MessagingGateway);
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /messaging/chats ────────────────────────────────────────────────

  describe('POST /messaging/chats', () => {
    it('should return 400 when body is empty', async () => {
      return request(app.getHttpServer())
        .post('/messaging/chats')
        .send({})
        .expect(400);
    });

    it('should return 400 when receiverId is not a positive integer', async () => {
      return request(app.getHttpServer())
        .post('/messaging/chats')
        .send({ receiverId: 'abc' })
        .expect(400);
    });

    it('should call chatsService.create with the authenticated userId and dto', async () => {
      const createSpy = jest
        .spyOn(chatsService, 'create')
        .mockResolvedValue(mockChat as any);

      await request(app.getHttpServer())
        .post('/messaging/chats')
        .send({ receiverId: 2 })
        .expect(201);

      expect(createSpy).toHaveBeenCalledWith(mockUser.userId, {
        receiverId: 2,
      });
    });

    it('should return 201 with the created chat', async () => {
      jest.spyOn(chatsService, 'create').mockResolvedValue(mockChat as any);

      const response = await request(app.getHttpServer())
        .post('/messaging/chats')
        .send({ receiverId: 2 })
        .expect(201);

      expect(response.body).toEqual(mockChat);
    });

    it('should return 400 when trying to chat with yourself', async () => {
      jest
        .spyOn(chatsService, 'create')
        .mockRejectedValue(
          new BadRequestException('Não pode criar um chat consigo mesmo.'),
        );

      const response = await request(app.getHttpServer())
        .post('/messaging/chats')
        .send({ receiverId: mockUser.userId })
        .expect(400);

      expect((response.body as { message: string }).message).toBe(
        'Não pode criar um chat consigo mesmo.',
      );
    });
  });

  // ── GET /messaging/chats ─────────────────────────────────────────────────

  describe('GET /messaging/chats', () => {
    it('should call chatsService.findAll with the authenticated userId', async () => {
      const findAllSpy = jest
        .spyOn(chatsService, 'findAll')
        .mockResolvedValue([mockChat] as any);

      await request(app.getHttpServer()).get('/messaging/chats').expect(200);

      expect(findAllSpy).toHaveBeenCalledWith(mockUser.userId);
    });

    it('should return 200 with the list of chats', async () => {
      jest.spyOn(chatsService, 'findAll').mockResolvedValue([mockChat] as any);

      const response = await request(app.getHttpServer())
        .get('/messaging/chats')
        .expect(200);

      expect(response.body).toEqual([mockChat]);
    });
  });

  // ── GET /messaging/chats/:id ─────────────────────────────────────────────

  describe('GET /messaging/chats/:id', () => {
    it('should return 400 when id is not a number', async () => {
      return request(app.getHttpServer())
        .get('/messaging/chats/abc')
        .expect(400);
    });

    it('should call chatsService.findOne with the chat id', async () => {
      const findOneSpy = jest
        .spyOn(chatsService, 'findOne')
        .mockResolvedValue(mockChat as any);

      await request(app.getHttpServer()).get('/messaging/chats/1').expect(200);

      expect(findOneSpy).toHaveBeenCalledWith(1);
    });

    it('should return 404 when the chat does not exist', async () => {
      jest
        .spyOn(chatsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Chat não encontrado.'));

      const response = await request(app.getHttpServer())
        .get('/messaging/chats/99')
        .expect(404);

      expect((response.body as { message: string }).message).toBe(
        'Chat não encontrado.',
      );
    });
  });

  // ── DELETE /messaging/chats/:id ──────────────────────────────────────────

  describe('DELETE /messaging/chats/:id', () => {
    it('should return 400 when id is not a number', async () => {
      return request(app.getHttpServer())
        .delete('/messaging/chats/abc')
        .expect(400);
    });

    it('should call chatsService.delete with id and userId', async () => {
      const deleteSpy = jest
        .spyOn(chatsService, 'delete')
        .mockResolvedValue(mockChat as any);

      await request(app.getHttpServer())
        .delete('/messaging/chats/1')
        .expect(200);

      expect(deleteSpy).toHaveBeenCalledWith(1, mockUser.userId);
    });

    it('should broadcast chat_deleted to the chat room after deleting', async () => {
      const roomEmit = jest.fn();
      const toSpy = jest.fn().mockReturnValue({ emit: roomEmit });
      const mockServer = { to: toSpy } as unknown as Server;
      gateway.server = mockServer;
      jest.spyOn(chatsService, 'delete').mockResolvedValue(mockChat as any);

      await request(app.getHttpServer())
        .delete('/messaging/chats/1')
        .expect(200);

      expect(toSpy).toHaveBeenCalledWith('chat:1');
      expect(roomEmit).toHaveBeenCalledWith('chat_deleted', { chatId: 1 });
    });

    it('should return 403 when the user is not a participant', async () => {
      jest
        .spyOn(chatsService, 'delete')
        .mockRejectedValue(
          new ForbiddenException('Não tem permissão para apagar este chat.'),
        );

      const response = await request(app.getHttpServer())
        .delete('/messaging/chats/1')
        .expect(403);

      expect((response.body as { message: string }).message).toBe(
        'Não tem permissão para apagar este chat.',
      );
    });
  });

  // ── POST /messaging/chats/:chatId/messages ───────────────────────────────

  describe('POST /messaging/chats/:chatId/messages', () => {
    const validBody = { receiverId: 2, message: 'Olá!' };

    it('should return 400 when chatId is not a number', async () => {
      return request(app.getHttpServer())
        .post('/messaging/chats/abc/messages')
        .send(validBody)
        .expect(400);
    });

    it('should call messagesService.create with correct data', async () => {
      jest.spyOn(chatsService, 'findOne').mockResolvedValue(mockChat as any);
      const createSpy = jest
        .spyOn(messagesService, 'create')
        .mockResolvedValue(mockMessage as any);

      await request(app.getHttpServer())
        .post('/messaging/chats/1/messages')
        .send(validBody)
        .expect(201);

      expect(createSpy).toHaveBeenCalledWith({
        senderId: mockUser.userId,
        receiverId: validBody.receiverId,
        chatId: mockChat.id,
        message: validBody.message,
      });
    });

    it('should broadcast message_received to the chat room', async () => {
      jest.spyOn(chatsService, 'findOne').mockResolvedValue(mockChat as any);
      jest
        .spyOn(messagesService, 'create')
        .mockResolvedValue(mockMessage as any);
      const roomEmit = jest.fn();
      const toSpy = jest.fn().mockReturnValue({ emit: roomEmit });
      const mockServer = { to: toSpy } as unknown as Server;
      gateway.server = mockServer;

      await request(app.getHttpServer())
        .post('/messaging/chats/1/messages')
        .send(validBody)
        .expect(201);

      expect(toSpy).toHaveBeenCalledWith('chat:1');
      expect(roomEmit).toHaveBeenCalledWith('message_received', mockMessage);
    });

    it('should return 201 with the saved message', async () => {
      jest.spyOn(chatsService, 'findOne').mockResolvedValue(mockChat as any);
      jest
        .spyOn(messagesService, 'create')
        .mockResolvedValue(mockMessage as any);

      const response = await request(app.getHttpServer())
        .post('/messaging/chats/1/messages')
        .send(validBody)
        .expect(201);

      expect(response.body).toEqual(mockMessage);
    });

    it('should return 404 when the chat does not exist', async () => {
      jest
        .spyOn(chatsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Chat não encontrado.'));

      const response = await request(app.getHttpServer())
        .post('/messaging/chats/99/messages')
        .send(validBody)
        .expect(404);

      expect((response.body as { message: string }).message).toBe(
        'Chat não encontrado.',
      );
    });
  });

  // ── GET /messaging/chats/:chatId/messages ────────────────────────────────

  describe('GET /messaging/chats/:chatId/messages', () => {
    it('should return 400 when chatId is not a number', async () => {
      return request(app.getHttpServer())
        .get('/messaging/chats/abc/messages')
        .expect(400);
    });

    it('should call messagesService.findAll with the chatId', async () => {
      const findAllSpy = jest
        .spyOn(messagesService, 'findAll')
        .mockResolvedValue([mockMessage] as any);

      await request(app.getHttpServer())
        .get('/messaging/chats/1/messages')
        .expect(200);

      expect(findAllSpy).toHaveBeenCalledWith(1);
    });

    it('should return 200 with the list of messages', async () => {
      jest
        .spyOn(messagesService, 'findAll')
        .mockResolvedValue([mockMessage] as any);

      const response = await request(app.getHttpServer())
        .get('/messaging/chats/1/messages')
        .expect(200);

      expect(response.body).toEqual([mockMessage]);
    });
  });

  // ── PATCH /messaging/messages/:id ────────────────────────────────────────

  describe('PATCH /messaging/messages/:id', () => {
    it('should return 400 when id is not a number', async () => {
      return request(app.getHttpServer())
        .patch('/messaging/messages/abc')
        .send({ message: 'Editado!' })
        .expect(400);
    });

    it('should call messagesService.update with id, userId and dto', async () => {
      const updated = { ...mockMessage, message: 'Editado!' };
      const updateSpy = jest
        .spyOn(messagesService, 'update')
        .mockResolvedValue(updated as any);

      await request(app.getHttpServer())
        .patch('/messaging/messages/10')
        .send({ message: 'Editado!' })
        .expect(200);

      expect(updateSpy).toHaveBeenCalledWith(10, mockUser.userId, {
        message: 'Editado!',
      });
    });

    it('should broadcast message_updated to the chat room', async () => {
      const updated = { ...mockMessage, message: 'Editado!' };
      jest.spyOn(messagesService, 'update').mockResolvedValue(updated as any);
      const roomEmit = jest.fn();
      const toSpy = jest.fn().mockReturnValue({ emit: roomEmit });
      const mockServer = { to: toSpy } as unknown as Server;
      gateway.server = mockServer;

      await request(app.getHttpServer())
        .patch('/messaging/messages/10')
        .send({ message: 'Editado!' })
        .expect(200);

      expect(toSpy).toHaveBeenCalledWith(`chat:${mockMessage.chatId}`);
      expect(roomEmit).toHaveBeenCalledWith('message_updated', updated);
    });

    it('should return 403 when the user is not the sender', async () => {
      jest
        .spyOn(messagesService, 'update')
        .mockRejectedValue(
          new ForbiddenException(
            'Não tem permissão para editar esta mensagem.',
          ),
        );

      const response = await request(app.getHttpServer())
        .patch('/messaging/messages/10')
        .send({ message: 'Editado!' })
        .expect(403);

      expect((response.body as { message: string }).message).toBe(
        'Não tem permissão para editar esta mensagem.',
      );
    });

    it('should return 404 when the message does not exist', async () => {
      jest
        .spyOn(messagesService, 'update')
        .mockRejectedValue(new NotFoundException('Mensagem não encontrada.'));

      const response = await request(app.getHttpServer())
        .patch('/messaging/messages/99')
        .send({ message: 'Editado!' })
        .expect(404);

      expect((response.body as { message: string }).message).toBe(
        'Mensagem não encontrada.',
      );
    });
  });

  // ── DELETE /messaging/messages/:id ───────────────────────────────────────

  describe('DELETE /messaging/messages/:id', () => {
    it('should return 400 when id is not a number', async () => {
      return request(app.getHttpServer())
        .delete('/messaging/messages/abc')
        .expect(400);
    });

    it('should call messagesService.delete with id and userId', async () => {
      const deleteSpy = jest
        .spyOn(messagesService, 'delete')
        .mockResolvedValue(mockMessage as any);

      await request(app.getHttpServer())
        .delete('/messaging/messages/10')
        .expect(200);

      expect(deleteSpy).toHaveBeenCalledWith(10, mockUser.userId);
    });

    it('should broadcast message_deleted to the chat room', async () => {
      jest
        .spyOn(messagesService, 'delete')
        .mockResolvedValue(mockMessage as any);
      const roomEmit = jest.fn();
      const toSpy = jest.fn().mockReturnValue({ emit: roomEmit });
      const mockServer = { to: toSpy } as unknown as Server;
      gateway.server = mockServer;

      await request(app.getHttpServer())
        .delete('/messaging/messages/10')
        .expect(200);

      expect(toSpy).toHaveBeenCalledWith(`chat:${mockMessage.chatId}`);
      expect(roomEmit).toHaveBeenCalledWith('message_deleted', {
        messageId: 10,
      });
    });

    it('should return 403 when the user is not the sender', async () => {
      jest
        .spyOn(messagesService, 'delete')
        .mockRejectedValue(
          new ForbiddenException(
            'Não tem permissão para apagar esta mensagem.',
          ),
        );

      const response = await request(app.getHttpServer())
        .delete('/messaging/messages/10')
        .expect(403);

      expect((response.body as { message: string }).message).toBe(
        'Não tem permissão para apagar esta mensagem.',
      );
    });

    it('should return 404 when the message does not exist', async () => {
      jest
        .spyOn(messagesService, 'delete')
        .mockRejectedValue(new NotFoundException('Mensagem não encontrada.'));

      const response = await request(app.getHttpServer())
        .delete('/messaging/messages/99')
        .expect(404);

      expect((response.body as { message: string }).message).toBe(
        'Mensagem não encontrada.',
      );
    });
  });
});
