import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateMessageDto) {
    return this.prisma.message.create({
      data: {
        senderId: dto.senderId,
        receiverId: dto.receiverId,
        chatId: dto.chatId,
        message: dto.message,
      },
    });
  }

  async findAll(chatId: number) {
    return this.prisma.message.findMany({
      where: { chatId },
    });
  }

  async findOne(id: number) {
    const message = await this.prisma.message.findUnique({ where: { id } });

    if (!message) throw new NotFoundException('Mensagem não encontrada.');

    return message;
  }

  async update(id: number, senderId: number, dto: UpdateMessageDto) {
    const message = await this.prisma.message.findUnique({ where: { id } });

    if (!message) throw new NotFoundException('Mensagem não encontrada.');

    if (message.senderId !== senderId)
      throw new ForbiddenException('Não tem permissão para editar esta mensagem.');

    return this.prisma.message.update({
      where: { id },
      data: { message: dto.message },
    });
  }

  async delete(id: number, senderId: number) {
    const message = await this.prisma.message.findUnique({ where: { id } });

    if (!message) throw new NotFoundException('Mensagem não encontrada.');

    if (message.senderId !== senderId)
      throw new ForbiddenException('Não tem permissão para apagar esta mensagem.');

    return this.prisma.message.delete({ where: { id } });
  }
}
