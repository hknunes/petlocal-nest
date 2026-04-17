import { Module } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { ChatsModule } from '../chats/chats.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [ChatsModule, MessagesModule],
  providers: [MessagingGateway],
})
export class MessagingModule {}
