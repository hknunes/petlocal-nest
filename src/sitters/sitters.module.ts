import { Module } from '@nestjs/common';
import { SittersService } from './sitters.service';
import { SitterController } from './sitters.controller';

@Module({
  providers: [SittersService],
  controllers: [SitterController],
})
export class SittersModule {}
