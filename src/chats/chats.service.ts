import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateChatDto } from './dto/create-chat.dto';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  async create(senderId: number, dto: CreateChatDto) {
    if (senderId === dto.receiverId)
      throw new BadRequestException('Não pode criar um chat consigo mesmo.');

    const existing = await this.prisma.chat.findFirst({
      where: {
        OR: [
          { senderId, receiverId: dto.receiverId },
          { senderId: dto.receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing) return existing;

    return this.prisma.chat.create({
      data: { senderId, receiverId: dto.receiverId },
    });
  }

  async findAll(userId: number) {
    return this.prisma.chat.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: { messages: true },
    });
  }

  async findOne(id: number) {
    const chat = await this.prisma.chat.findUnique({
      where: { id },
      include: { messages: true },
    });

    if (!chat) throw new NotFoundException('Chat não encontrado.');

    return chat;
  }

  async update(id: number, userId: number) {
    const chat = await this.prisma.chat.findUnique({ where: { id } });

    if (!chat) throw new NotFoundException('Chat não encontrado.');

    if (chat.senderId !== userId && chat.receiverId !== userId)
      throw new ForbiddenException('Não tem acesso a este chat.');

    return chat;
  }

  async delete(id: number, userId: number) {
    const chat = await this.prisma.chat.findUnique({ where: { id } });

    if (!chat) throw new NotFoundException('Chat não encontrado.');

    if (chat.senderId !== userId && chat.receiverId !== userId)
      throw new ForbiddenException('Não tem permissão para apagar este chat.');

    return this.prisma.chat.delete({ where: { id } });
  }
}
