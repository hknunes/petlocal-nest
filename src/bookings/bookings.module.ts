import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module'; // Importante para ter o PrismaService
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PrismaModule], // 👈 O Module precisa do PrismaService para funcionar
  controllers: [BookingsController],
  providers: [BookingsService], // 👈 O NestJS precisa disto para saber o que injetar no Controller
})
export class BookingsModule {}
