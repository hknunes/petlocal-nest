import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateChatDto } from './dto/create-chat.dto';

describe('ChatsService', () => {
  let service: ChatsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        {
          provide: PrismaService,
          useValue: {
            chat: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const senderId = 1;
    const dto: CreateChatDto = { receiverId: 2 };
    const mockChat = { id: 1, senderId, receiverId: dto.receiverId };

    it('should throw BadRequestException when sender and receiver are the same user', async () => {
      await expect(service.create(1, { receiverId: 1 })).rejects.toThrow(BadRequestException);
      expect(prisma.chat.findFirst).not.toHaveBeenCalled();
    });

    it('should return the existing chat when one already exists between the two users', async () => {
      jest.spyOn(prisma.chat, 'findFirst').mockResolvedValue(mockChat as any);

      const result = await service.create(senderId, dto);

      expect(prisma.chat.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockChat);
    });

    it('should create a new chat when none exists between the two users', async () => {
      jest.spyOn(prisma.chat, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.chat, 'create').mockResolvedValue(mockChat as any);

      await service.create(senderId, dto);

      expect(prisma.chat.create).toHaveBeenCalledWith({
        data: { senderId, receiverId: dto.receiverId },
      });
    });

    it('should return the created chat', async () => {
      jest.spyOn(prisma.chat, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.chat, 'create').mockResolvedValue(mockChat as any);

      const result = await service.create(senderId, dto);

      expect(result).toEqual(mockChat);
    });
  });

  describe('findAll', () => {
    it('should query chats where the user is sender or receiver', async () => {
      jest.spyOn(prisma.chat, 'findMany').mockResolvedValue([]);

      await service.findAll(1);

      expect(prisma.chat.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ senderId: 1 }, { receiverId: 1 }] },
        }),
      );
    });

    it('should return the list of chats', async () => {
      const mockChats = [{ id: 1 }, { id: 2 }];
      jest.spyOn(prisma.chat, 'findMany').mockResolvedValue(mockChats as any);

      const result = await service.findAll(1);

      expect(result).toEqual(mockChats);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the chat does not exist', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('should return the chat when found', async () => {
      const mockChat = { id: 1, senderId: 1, receiverId: 2, messages: [] };
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(mockChat as any);

      const result = await service.findOne(1);

      expect(result).toEqual(mockChat);
    });

    it('should query by the correct id', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue({ id: 1 } as any);

      await service.findOne(1);

      expect(prisma.chat.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });
  });

  describe('update', () => {
    const userId = 1;
    const mockChat = { id: 1, senderId: userId, receiverId: 2 };

    it('should throw NotFoundException when the chat does not exist', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(null);

      await expect(service.update(99, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when the user is not a participant', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue({ ...mockChat, senderId: 5, receiverId: 6 } as any);

      await expect(service.update(1, userId)).rejects.toThrow(ForbiddenException);
    });

    it('should return the chat when the user is the sender', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(mockChat as any);

      const result = await service.update(1, userId);

      expect(result).toEqual(mockChat);
    });

    it('should return the chat when the user is the receiver', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(mockChat as any);

      const result = await service.update(1, mockChat.receiverId);

      expect(result).toEqual(mockChat);
    });
  });

  describe('delete', () => {
    const userId = 1;
    const mockChat = { id: 1, senderId: userId, receiverId: 2 };

    it('should throw NotFoundException when the chat does not exist', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(null);

      await expect(service.delete(99, userId)).rejects.toThrow(NotFoundException);
      expect(prisma.chat.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user is not a participant', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue({ ...mockChat, senderId: 5, receiverId: 6 } as any);

      await expect(service.delete(1, userId)).rejects.toThrow(ForbiddenException);
      expect(prisma.chat.delete).not.toHaveBeenCalled();
    });

    it('should delete the chat when the user is the sender', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(mockChat as any);
      jest.spyOn(prisma.chat, 'delete').mockResolvedValue(mockChat as any);

      await service.delete(1, userId);

      expect(prisma.chat.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should delete the chat when the user is the receiver', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(mockChat as any);
      jest.spyOn(prisma.chat, 'delete').mockResolvedValue(mockChat as any);

      await service.delete(1, mockChat.receiverId);

      expect(prisma.chat.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return the deleted chat', async () => {
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(mockChat as any);
      jest.spyOn(prisma.chat, 'delete').mockResolvedValue(mockChat as any);

      const result = await service.delete(1, userId);

      expect(result).toEqual(mockChat);
    });
  });
});
