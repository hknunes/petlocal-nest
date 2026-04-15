import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { ActiveUserInterface } from 'src/auth/interfaces/active-user.interface';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um pedido de reserva (Dono)' })
  create(
    @CurrentUser() user: ActiveUserInterface,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user.userId, dto);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Listar as minhas reservas (Dono ou Sitter)' })
  findAll(@CurrentUser() user: ActiveUserInterface) {
    // Se o user tiver role SITTER, vê o que lhe pediram. Se for OWNER, vê o que pediu.
    const role = user.roles.includes('SITTER') ? 'SITTER' : 'OWNER';
    return this.bookingsService.getMyBookings(user.userId, role);
  }
}
