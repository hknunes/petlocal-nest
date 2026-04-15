import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from '@prisma/client'; // 👈 Importa o tipo gerado pelo Prisma

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // Adicionamos : Promise<Booking> para garantir a segurança do tipo
  async create(ownerId: number, dto: CreateBookingDto): Promise<Booking> {
    // 1. Verificar se o Pet pertence ao Dono
    const pet = await this.prisma.pet.findFirst({
      where: { id: dto.petId, ownerId: ownerId },
    });
    if (!pet) throw new BadRequestException('Este animal não lhe pertence.');

    // 2. Obter o preço do Sitter
    const sitter = await this.prisma.sitterProfile.findUnique({
      where: { id: dto.sitterProfileId },
    });
    if (!sitter) throw new NotFoundException('Cuidador não encontrado.');

    // 3. Calcular total de dias (mínimo 1 dia)
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // 4. Criar a reserva
    return this.prisma.booking.create({
      data: {
        startDate: start,
        endDate: end,
        totalPrice: diffDays * sitter.pricePerDay,
        status: 'PENDING',
        ownerId: ownerId,
        sitterProfileId: dto.sitterProfileId,
        petId: dto.petId,
      },
      include: {
        sitterProfile: { include: { user: { select: { username: true } } } },
      },
    }) as Promise<Booking>; // 👈 O "as Promise" garante ao linter que o retorno é seguro
  }

  // Adicionamos : Promise<any[]> (ou cria uma interface para os resultados com include)
  async getMyBookings(
    userId: number,
    role: 'OWNER' | 'SITTER',
  ): Promise<any[]> {
    if (role === 'SITTER') {
      return this.prisma.booking.findMany({
        where: { sitterProfile: { userId: userId } },
        include: { owner: { select: { username: true } }, pet: true },
      });
    }
    return this.prisma.booking.findMany({
      where: { ownerId: userId },
      include: {
        sitterProfile: { include: { user: { select: { username: true } } } },
      },
    });
  }
}
