import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { MessagingGateway } from './messaging.gateway';
import { ChatsService } from '../chats/chats.service';
import { MessagesService } from '../messages/messages.service';

const mockChat = { id: 1, senderId: 1, receiverId: 2, messages: [] };
const mockMessage = {
  id: 10,
  senderId: 1,
  receiverId: 2,
  chatId: 1,
  message: 'Olá!',
};

interface MockSocket {
  userId: number;
  username: string;
  handshake: { auth: { token?: string }; headers: Record<string, string> };
  join: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
}

function createSocket(overrides: Partial<MockSocket> = {}): MockSocket {
  return {
    userId: 1,
    username: 'testuser',
    handshake: { auth: { token: 'valid_token' }, headers: {} },
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };
}

describe('MessagingGateway', () => {
  let gateway: MessagingGateway;
  let jwtService: JwtService;
  let chatsService: ChatsService;
  let messagesService: MessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ChatsService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: MessagesService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);
    jwtService = module.get<JwtService>(JwtService);
    chatsService = module.get<ChatsService>(ChatsService);
    messagesService = module.get<MessagesService>(MessagesService);

    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as unknown as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should attach userId and username to socket when token is valid', async () => {
      const socket = createSocket({ userId: undefined, username: undefined });
      const verifyAsyncSpy = jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ sub: 1, username: 'testuser' });

      await gateway.handleConnection(socket as any);

      expect(verifyAsyncSpy).toHaveBeenCalled();
      expect(socket.userId).toBe(1);
      expect(socket.username).toBe('testuser');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('should read token from Authorization header when auth.token is absent', async () => {
      const socket = createSocket({
        userId: undefined,
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header_token' },
        },
      });
      const verifyAsyncSpy = jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ sub: 2, username: 'other' });

      await gateway.handleConnection(socket as any);

      expect(verifyAsyncSpy).toHaveBeenCalledWith(
        'header_token',
        expect.any(Object),
      );
      expect(socket.userId).toBe(2);
    });

    it('should disconnect the socket when no token is provided', async () => {
      const socket = createSocket({
        handshake: { auth: {}, headers: {} },
      });

      await gateway.handleConnection(socket as any);

      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect the socket when the token is invalid', async () => {
      const socket = createSocket();
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('invalid token'));

      await gateway.handleConnection(socket as any);

      expect(socket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should log the disconnected user without throwing', () => {
      const socket = createSocket();
      expect(() => gateway.handleDisconnect(socket as any)).not.toThrow();
    });
  });

  describe('handleJoinChat', () => {
    it('should join the correct room when the user is the sender', async () => {
      jest.spyOn(chatsService, 'findOne').mockResolvedValue(mockChat as any);
      const socket = createSocket({ userId: mockChat.senderId });

      await gateway.handleJoinChat(socket as any, { chatId: 1 });

      expect(socket.join).toHaveBeenCalledWith('chat:1');
      expect(socket.emit).toHaveBeenCalledWith('joined_chat', { chatId: 1 });
    });

    it('should join the correct room when the user is the receiver', async () => {
      jest.spyOn(chatsService, 'findOne').mockResolvedValue(mockChat as any);
      const socket = createSocket({ userId: mockChat.receiverId });

      await gateway.handleJoinChat(socket as any, { chatId: 1 });

      expect(socket.join).toHaveBeenCalledWith('chat:1');
    });

    it('should emit an error when the user is not a participant', async () => {
      jest.spyOn(chatsService, 'findOne').mockResolvedValue(mockChat as any);
      const socket = createSocket({ userId: 99 });

      await gateway.handleJoinChat(socket as any, { chatId: 1 });

      expect(socket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.any(String) as string }),
      );
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException when the chat does not exist', async () => {
      jest
        .spyOn(chatsService, 'findOne')
        .mockRejectedValue(new NotFoundException());
      const socket = createSocket();

      await expect(
        gateway.handleJoinChat(socket as any, { chatId: 99 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleSendMessage', () => {
    it('should persist the message and broadcast to the chat room', async () => {
      const createSpy = jest
        .spyOn(messagesService, 'create')
        .mockResolvedValue(mockMessage as any);
      const roomEmit = jest.fn();
      const toSpy = jest.fn().mockReturnValue({ emit: roomEmit });
      gateway.server = { to: toSpy } as unknown as Server;
      const socket = createSocket();

      await gateway.handleSendMessage(socket as any, {
        chatId: 1,
        receiverId: 2,
        message: 'Olá!',
      });

      expect(createSpy).toHaveBeenCalledWith({
        senderId: socket.userId,
        receiverId: 2,
        chatId: 1,
        message: 'Olá!',
      });
      expect(toSpy).toHaveBeenCalledWith('chat:1');
      expect(roomEmit).toHaveBeenCalledWith('message_received', mockMessage);
    });
  });

  describe('handleUpdateMessage', () => {
    it('should update the message and broadcast to the chat room', async () => {
      const updated = { ...mockMessage, message: 'Editado!' };
      const updateSpy = jest
        .spyOn(messagesService, 'update')
        .mockResolvedValue(updated as any);
      const roomEmit = jest.fn();
      const toSpy = jest.fn().mockReturnValue({ emit: roomEmit });
      gateway.server = { to: toSpy } as unknown as Server;
      const socket = createSocket();

      await gateway.handleUpdateMessage(socket as any, {
        messageId: 10,
        chatId: 1,
        message: 'Editado!',
      });

      expect(updateSpy).toHaveBeenCalledWith(10, socket.userId, {
        message: 'Editado!',
      });
      expect(toSpy).toHaveBeenCalledWith('chat:1');
      expect(roomEmit).toHaveBeenCalledWith('message_updated', updated);
    });

    it('should propagate ForbiddenException when the user is not the sender', async () => {
      jest
        .spyOn(messagesService, 'update')
        .mockRejectedValue(new ForbiddenException());
      const socket = createSocket({ userId: 99 });

      await expect(
        gateway.handleUpdateMessage(socket as any, {
          messageId: 10,
          chatId: 1,
          message: 'x',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('handleDeleteMessage', () => {
    it('should delete the message and broadcast to the chat room', async () => {
      const deleteSpy = jest
        .spyOn(messagesService, 'delete')
        .mockResolvedValue(mockMessage as any);
      const roomEmit = jest.fn();
      const toSpy = jest.fn().mockReturnValue({ emit: roomEmit });
      gateway.server = { to: toSpy } as unknown as Server;
      const socket = createSocket();

      await gateway.handleDeleteMessage(socket as any, {
        messageId: 10,
        chatId: 1,
      });

      expect(deleteSpy).toHaveBeenCalledWith(10, socket.userId);
      expect(toSpy).toHaveBeenCalledWith('chat:1');
      expect(roomEmit).toHaveBeenCalledWith('message_deleted', {
        messageId: 10,
      });
    });

    it('should propagate ForbiddenException when the user is not the sender', async () => {
      jest
        .spyOn(messagesService, 'delete')
        .mockRejectedValue(new ForbiddenException());
      const socket = createSocket({ userId: 99 });

      await expect(
        gateway.handleDeleteMessage(socket as any, {
          messageId: 10,
          chatId: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
