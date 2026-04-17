import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateMessageDto {
  @ApiProperty({ example: 'Hello World!' })
  @IsString()
  message: string;
}
