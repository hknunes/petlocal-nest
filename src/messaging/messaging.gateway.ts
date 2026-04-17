import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { ChatsService } from '../chats/chats.service';
import { MessagesService } from '../messages/messages.service';
import { jwtConstants } from '../auth/constants';

interface AuthenticatedSocket extends Socket {
  userId: number;
  username: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private chatsService: ChatsService,
    private messagesService: MessagesService,
  ) {}

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new UnauthorizedException();

      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });

      socket.userId = payload.sub;
      socket.username = payload.username;

      console.log(`[WS] Connected: ${socket.username} (id: ${socket.userId})`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    console.log(`[WS] Disconnected: ${socket.username ?? socket.id}`);
  }

  // Join a chat room — validates user is a participant
  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { chatId: number },
  ) {
    const chat = await this.chatsService.findOne(payload.chatId);

    if (chat.senderId !== socket.userId && chat.receiverId !== socket.userId) {
      socket.emit('error', { message: 'Não tem acesso a este chat.' });
      return;
    }

    await socket.join(`chat:${payload.chatId}`);
    socket.emit('joined_chat', { chatId: payload.chatId });
  }

  // Send a message — persists to DB and broadcasts to chat room
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { chatId: number; receiverId: number; message: string },
  ) {
    const saved = await this.messagesService.create({
      senderId: socket.userId,
      receiverId: payload.receiverId,
      chatId: payload.chatId,
      message: payload.message,
    });

    this.server.to(`chat:${payload.chatId}`).emit('message_received', saved);
  }

  // Edit a message — only the sender can edit
  @SubscribeMessage('update_message')
  async handleUpdateMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { messageId: number; chatId: number; message: string },
  ) {
    const updated = await this.messagesService.update(
      payload.messageId,
      socket.userId,
      { message: payload.message },
    );

    this.server.to(`chat:${payload.chatId}`).emit('message_updated', updated);
  }

  // Delete a message — only the sender can delete
  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: { messageId: number; chatId: number },
  ) {
    await this.messagesService.delete(payload.messageId, socket.userId);

    this.server
      .to(`chat:${payload.chatId}`)
      .emit('message_deleted', { messageId: payload.messageId });
  }
}
