import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PetsModule } from './pets/pets.module';
import { SittersModule } from './sitters/sitters.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { BookingsService } from './bookings/bookings.service';
import { BookingsModule } from './bookings/bookings.module';
import { ChatsService } from './chats/chats.service';
import { ChatsModule } from './chats/chats.module';
import { MessagesController } from './messages/messages.controller';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [UsersModule, AuthModule, PetsModule, SittersModule, PrismaModule, BookingsModule, ChatsModule, MessagesModule],
  controllers: [AppController, MessagesController],
  providers: [AppService, PrismaService, BookingsService, ChatsService],
})
export class AppModule {}
