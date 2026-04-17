import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PetsModule } from './pets/pets.module';
import { SittersModule } from './sitters/sitters.module';
import { PrismaModule } from './prisma/prisma.module';
import { BookingsModule } from './bookings/bookings.module';
import { ChatsModule } from './chats/chats.module';
import { MessagesModule } from './messages/messages.module';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    PetsModule,
    SittersModule,
    PrismaModule,
    BookingsModule,
    ChatsModule,
    MessagesModule,
    MessagingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
