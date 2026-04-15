import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request as ReqDecorator, // Renomeia o decorator para não colidir com o tipo
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt')) // Protege todas as rotas de pets
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  create(
    @Body() createPetDto: CreatePetDto,
    @ReqDecorator() req: RequestWithUser,
  ) {
    // req.user.userId vem do teu JwtStrategy (payload.sub)
    const authenticatedUserId = req.user.userId || req.user.sub;
    return this.petsService.create(createPetDto, Number(authenticatedUserId));
  }

  @Get()
  @ApiQuery({ name: 'ownerId', required: false, type: Number }) // Força o Swagger
  findAll(
    @Query('ownerId', new ParseIntPipe({ optional: true })) ownerId?: number,
  ) {
    return this.petsService.findAll(ownerId);
  }
}

interface RequestWithUser extends Request {
  user: {
    userId: number;
    username: string;
    email: string;
    sub?: number; // Adicionado para evitar erro no || payload.sub
  };
}
