import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagingGateway } from './messaging.gateway';
import { ChatsService } from '../chats/chats.service';
import { MessagesService } from '../messages/messages.service';
import { CreateChatDto } from '../chats/dto/create-chat.dto';
import { UpdateMessageDto } from '../messages/dto/update-message.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { ActiveUserInterface } from 'src/auth/interfaces/active-user.interface';

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messaging')
export class MessagingController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService,
    private readonly gateway: MessagingGateway,
  ) {}

  // ── Chats ────────────────────────────────────────────────────────────────

  @Post('chats')
  @ApiOperation({ summary: 'Criar ou obter um chat entre dois utilizadores' })
  createChat(
    @CurrentUser() user: ActiveUserInterface,
    @Body() dto: CreateChatDto,
  ) {
    return this.chatsService.create(user.userId, dto);
  }

  @Get('chats')
  @ApiOperation({ summary: 'Listar todos os chats do utilizador autenticado' })
  findAllChats(@CurrentUser() user: ActiveUserInterface) {
    return this.chatsService.findAll(user.userId);
  }

  @Get('chats/:id')
  @ApiOperation({ summary: 'Obter um chat pelo ID' })
  findChat(@Param('id', ParseIntPipe) id: number) {
    return this.chatsService.findOne(id);
  }

  @Delete('chats/:id')
  @ApiOperation({ summary: 'Apagar um chat' })
  async deleteChat(
    @CurrentUser() user: ActiveUserInterface,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const deleted = await this.chatsService.delete(id, user.userId);
    this.gateway.server.to(`chat:${id}`).emit('chat_deleted', { chatId: id });
    return deleted;
  }

  // ── Messages ─────────────────────────────────────────────────────────────

  @Post('chats/:chatId/messages')
  @ApiOperation({ summary: 'Enviar uma mensagem num chat' })
  async sendMessage(
    @CurrentUser() user: ActiveUserInterface,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: { receiverId: number; message: string },
  ) {
    const chat = await this.chatsService.findOne(chatId);
    const saved = await this.messagesService.create({
      senderId: user.userId,
      receiverId: body.receiverId,
      chatId: chat.id,
      message: body.message,
    });
    this.gateway.server.to(`chat:${chatId}`).emit('message_received', saved);
    return saved;
  }

  @Get('chats/:chatId/messages')
  @ApiOperation({ summary: 'Listar todas as mensagens de um chat' })
  findMessages(@Param('chatId', ParseIntPipe) chatId: number) {
    return this.messagesService.findAll(chatId);
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Editar uma mensagem (apenas o remetente)' })
  async updateMessage(
    @CurrentUser() user: ActiveUserInterface,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMessageDto,
  ) {
    const updated = await this.messagesService.update(id, user.userId, dto);
    this.gateway.server
      .to(`chat:${updated.chatId}`)
      .emit('message_updated', updated);
    return updated;
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Apagar uma mensagem (apenas o remetente)' })
  async deleteMessage(
    @CurrentUser() user: ActiveUserInterface,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const deleted = await this.messagesService.delete(id, user.userId);
    this.gateway.server
      .to(`chat:${deleted.chatId}`)
      .emit('message_deleted', { messageId: id });
    return deleted;
  }
}
