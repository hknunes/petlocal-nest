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

@Module({
  imports: [UsersModule, AuthModule, PetsModule, SittersModule, PrismaModule, BookingsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, BookingsService],
})
export class AppModule {}
