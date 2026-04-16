import { Test, TestingModule } from '@nestjs/testing';
import { SittersController } from './sitters.controller';
import { SittersService } from './sitters.service';
import { GetSittersFilterDto } from './dto/get-sitters-filter.dto';
import { PetType, ServiceType } from '@prisma/client';

describe('SittersController', () => {
  let controller: SittersController;
  let service: SittersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SittersController],
      providers: [
        {
          provide: SittersService,
          useValue: {
            updateSitterProfile: jest.fn(),
            getSitterProfile: jest.fn(),
            deleteSitterProfile: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SittersController>(SittersController);
    service = module.get<SittersService>(SittersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call sitterService.findAll with the provided filters', async () => {
      const filters: GetSittersFilterDto = {
        location: 'Lisboa',
        maxPrice: 20,
        animalType: PetType.DOG,
        serviceType: ServiceType.HOME_VISIT,
      };
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should return the list of sitters returned by the service', async () => {
      const mockSitters = [
        { id: 1, pricePerHour: 15, user: { username: 'john', location: 'Porto', photo: null } },
        { id: 2, pricePerHour: 25, user: { username: 'jane', location: 'Lisboa', photo: null } },
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(mockSitters as any);

      const result = await controller.findAll({});

      expect(result).toEqual(mockSitters);
    });

    it('should work with no filters', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should return an empty array when no sitters match', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll({ location: 'NonExistentCity' });

      expect(result).toEqual([]);
    });
  });
});
