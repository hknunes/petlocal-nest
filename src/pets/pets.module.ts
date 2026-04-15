import { Module } from '@nestjs/common';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';

@Module({
  controllers: [PetsController],
  providers: [PetsService],
  exports: [PetsService], // Caso precises usar noutros módulos
})
export class PetsModule {}
