import { Test, TestingModule } from '@nestjs/testing';
import { SittersController } from './sitters.controller';

describe('SittersController', () => {
  let controller: SittersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SittersController],
    }).compile();

    controller = module.get<SittersController>(SittersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
