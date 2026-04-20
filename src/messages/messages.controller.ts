import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessagesService } from './messages.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { ActiveUserInterface } from 'src/auth/interfaces/active-user.interface';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma mensagem' })
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Get('chat/:chatId')
  @ApiOperation({ summary: 'Listar todas as mensagens de um chat' })
  findAll(@Param('chatId', ParseIntPipe) chatId: number) {
    return this.messagesService.findAll(chatId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter uma mensagem pelo ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.messagesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar uma mensagem (apenas o remetente)' })
  update(
    @CurrentUser() user: ActiveUserInterface,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Apagar uma mensagem (apenas o remetente)' })
  delete(
    @CurrentUser() user: ActiveUserInterface,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messagesService.delete(id, user.userId);
  }
}
