import { Test, TestingModule } from '@nestjs/testing';
import { SittersService } from './sitters.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('SittersService', () => {
  let service: SittersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SittersService,
        {
          provide: PrismaService,
          useValue: {
            sitterProfile: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
              findMany: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SittersService>(SittersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
