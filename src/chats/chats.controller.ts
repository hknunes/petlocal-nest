import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { ActiveUserInterface } from 'src/auth/interfaces/active-user.interface';

@ApiTags('Chats')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar ou obter um chat entre dois utilizadores' })
  create(@CurrentUser() user: ActiveUserInterface, @Body() dto: CreateChatDto) {
    return this.chatsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os chats do utilizador autenticado' })
  findAll(@CurrentUser() user: ActiveUserInterface) {
    return this.chatsService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter um chat pelo ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chatsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Apagar um chat' })
  delete(
    @CurrentUser() user: ActiveUserInterface,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chatsService.delete(id, user.userId);
  }
}
