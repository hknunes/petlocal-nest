import {
  Controller,
  UseGuards,
  Post,
  Body
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sitters')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  @Post()
  create(
    @Body() createMessageDto: CreateMessageDto
  ) {
    return this.messagesService.create(createMessageDto);
  }
}
