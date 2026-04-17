import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: {
            message: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateMessageDto = {
      senderId: 1,
      receiverId: 2,
      chatId: 10,
      message: 'Hello World!',
    };

    it('should create a message with the correct data', async () => {
      jest.spyOn(prisma.message, 'create').mockResolvedValue({ id: 1 } as any);

      await service.create(dto);

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          senderId: dto.senderId,
          receiverId: dto.receiverId,
          chatId: dto.chatId,
          message: dto.message,
        },
      });
    });

    it('should return the created message', async () => {
      const mockMessage = { id: 1, ...dto };
      jest.spyOn(prisma.message, 'create').mockResolvedValue(mockMessage as any);

      const result = await service.create(dto);

      expect(result).toEqual(mockMessage);
    });
  });

  describe('findAll', () => {
    it('should query messages by chatId', async () => {
      jest.spyOn(prisma.message, 'findMany').mockResolvedValue([]);

      await service.findAll(10);

      expect(prisma.message.findMany).toHaveBeenCalledWith({ where: { chatId: 10 } });
    });

    it('should return the list of messages', async () => {
      const mockMessages = [{ id: 1 }, { id: 2 }];
      jest.spyOn(prisma.message, 'findMany').mockResolvedValue(mockMessages as any);

      const result = await service.findAll(10);

      expect(result).toEqual(mockMessages);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the message does not exist', async () => {
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('should return the message when found', async () => {
      const mockMessage = { id: 1, message: 'Hello' };
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue(mockMessage as any);

      const result = await service.findOne(1);

      expect(result).toEqual(mockMessage);
    });

    it('should query by the correct id', async () => {
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue({ id: 1 } as any);

      await service.findOne(1);

      expect(prisma.message.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('update', () => {
    const senderId = 1;
    const updateDto: UpdateMessageDto = { message: 'Updated text' };
    const mockMessage = { id: 1, senderId, message: 'Original text' };

    it('should throw NotFoundException when the message does not exist', async () => {
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue(null);

      await expect(service.update(1, senderId, updateDto)).rejects.toThrow(NotFoundException);
      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user is not the sender', async () => {
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue({ ...mockMessage, senderId: 99 } as any);

      await expect(service.update(1, senderId, updateDto)).rejects.toThrow(ForbiddenException);
      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('should update the message text', async () => {
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue(mockMessage as any);
      jest.spyOn(prisma.message, 'update').mockResolvedValue({ ...mockMessage, message: updateDto.message } as any);

      await service.update(1, senderId, updateDto);

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { message: updateDto.message },
      });
    });

    it('should return the updated message', async () => {
      const updated = { ...mockMessage, message: updateDto.message };
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue(mockMessage as any);
      jest.spyOn(prisma.message, 'update').mockResolvedValue(updated as any);

      const result = await service.update(1, senderId, updateDto);

      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    const senderId = 1;
    const mockMessage = { id: 1, senderId, message: 'Hello' };

    it('should throw NotFoundException when the message does not exist', async () => {
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue(null);

      await expect(service.delete(1, senderId)).rejects.toThrow(NotFoundException);
      expect(prisma.message.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user is not the sender', async () => {
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue({ ...mockMessage, senderId: 99 } as any);

      await expect(service.delete(1, senderId)).rejects.toThrow(ForbiddenException);
      expect(prisma.message.delete).not.toHaveBeenCalled();
    });

    it('should delete the message when the user is the sender', async () => {
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue(mockMessage as any);
      jest.spyOn(prisma.message, 'delete').mockResolvedValue(mockMessage as any);

      await service.delete(1, senderId);

      expect(prisma.message.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return the deleted message', async () => {
      jest.spyOn(prisma.message, 'findUnique').mockResolvedValue(mockMessage as any);
      jest.spyOn(prisma.message, 'delete').mockResolvedValue(mockMessage as any);

      const result = await service.delete(1, senderId);

      expect(result).toEqual(mockMessage);
    });
  });
});
