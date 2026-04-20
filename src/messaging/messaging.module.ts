import { Module } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { ChatsModule } from '../chats/chats.module';
import { MessagesModule } from '../messages/messages.module';
import { MessagingController } from './messaging.controller';

@Module({
  imports: [ChatsModule, MessagesModule],
  providers: [MessagingGateway],
  controllers: [MessagingController],
  exports: [MessagingGateway],
})
export class MessagingModule {}
