import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request as ReqDecorator, // Renomeia o decorator para não colidir com o tipo
  Query,
  Request,
} from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { use } from 'passport';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt')) // Protege todas as rotas de pets
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  create(
    @Body() createPetDto: CreatePetDto,
    @CurrentUser() user, // Usa o decorator para obter o usuário autenticado
  ) {
    console.log('Authenticated User ID:', user.userId); // Verifica se o userId está presente
    return this.petsService.create(createPetDto, Number(user.userId));
  }

  @Get()
  @ApiQuery({ name: 'ownerId', required: false, type: Number }) // Força o Swagger
  findAll(@Query('ownerId') ownerId?: number) {
    return this.petsService.findAll(ownerId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePetDto: UpdatePetDto) {
    return this.petsService.update(Number(id), updatePetDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt')) // Garante que só utilizadores autenticados acedem
  findMyPets(@CurrentUser() user) {
    return this.petsService.findAllByOwner(user.userId);
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
