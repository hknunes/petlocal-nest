import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AuthGuard } from '@nestjs/passport';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

const mockUser = { userId: 1, username: 'user', email: 'user@test.com', roles: ['OWNER'] };

class MockJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  }
}

describe('MessagesController (integration)', () => {
  let app: INestApplication;
  let messagesService: MessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
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

    messagesService = module.get<MessagesService>(MessagesService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /messages', () => {
    const validDto = {
      senderId: 1,
      receiverId: 2,
      chatId: 10,
      message: 'Hello World!',
    };

    it('should return 400 when the body is empty', async () => {
      return request(app.getHttpServer()).post('/messages').send({}).expect(400);
    });

    it('should return 400 when senderId is not an integer', async () => {
      return request(app.getHttpServer())
        .post('/messages')
        .send({ ...validDto, senderId: 'abc' })
        .expect(400);
    });

    it('should return 400 when message is not a string', async () => {
      return request(app.getHttpServer())
        .post('/messages')
        .send({ ...validDto, message: 123 })
        .expect(400);
    });

    it('should call messagesService.create with the dto', async () => {
      jest.spyOn(messagesService, 'create').mockResolvedValue({ id: 1 } as any);

      await request(app.getHttpServer()).post('/messages').send(validDto).expect(201);

      expect(messagesService.create).toHaveBeenCalledWith(validDto);
    });

    it('should return 201 with the created message', async () => {
      const mockMessage = { id: 1, ...validDto };
      jest.spyOn(messagesService, 'create').mockResolvedValue(mockMessage as any);

      const response = await request(app.getHttpServer())
        .post('/messages')
        .send(validDto)
        .expect(201);

      expect(response.body).toEqual(mockMessage);
    });
  });
});
