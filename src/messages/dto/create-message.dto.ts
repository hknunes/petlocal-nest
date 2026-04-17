import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CreateMessageDto {
    @ApiProperty()
    @IsInt()
    senderId: number;

    @ApiProperty()
    @IsInt()
    receiverId: number;

    @ApiProperty()
    @IsInt()
    chatId: number;

    @ApiProperty
    @IsString({ example: "Hello World!" })
    message: string;
}