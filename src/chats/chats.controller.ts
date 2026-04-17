import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
  create(
    @CurrentUser() user: ActiveUserInterface,
    @Body() dto: CreateChatDto,
  ) {
    return this.chatsService.create(user.userId, dto);
  }
}
