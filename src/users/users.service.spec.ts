import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';

const mockUser = {
  id: 1,
  name: 'Test User',
  username: 'testuser',
  email: 'test@mail.com',
  password: 'hashed_password',
  roles: [UserRole.OWNER],
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users when no role is provided', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([mockUser] as any);

      const result = await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual([mockUser]);
    });

    it('should filter users by role when provided', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([mockUser] as any);

      await service.findAll(UserRole.OWNER);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { roles: { has: UserRole.OWNER } },
      });
    });

    it('should throw NotFoundException when no users with the given role exist', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([]);

      await expect(service.findAll(UserRole.OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should query by username', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await service.findOne('testuser');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'testuser' } });
    });

    it('should return null when the user does not exist', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const result = await service.findOne('unknown');

      expect(result).toBeNull();
    });

    it('should return the user when found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.findOne('testuser');

      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneById', () => {
    it('should query by id', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await service.findOneById(1);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return null when the user does not exist', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const result = await service.findOneById(99);

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should query by email', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await service.findByEmail('test@mail.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@mail.com' } });
    });

    it('should return null when the email does not exist', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const result = await service.findByEmail('unknown@mail.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      name: 'Test User',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'hashed_password',
      roles: [UserRole.OWNER],
    };

    it('should create a user with the correct data', async () => {
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any);

      await service.create(dto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          email: dto.email,
          username: dto.username,
          password: dto.password,
          roles: dto.roles,
        },
      });
    });

    it('should use username as name when name is not provided', async () => {
      const dtoWithoutName = { ...dto, name: undefined };
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any);

      await service.create(dtoWithoutName as any);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: dto.username }),
        }),
      );
    });

    it('should return the user without the password', async () => {
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any);

      const result = await service.create(dto);

      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({ id: mockUser.id, username: mockUser.username });
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = { name: 'Updated Name' };

    it('should update the user with the correct data', async () => {
      jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, name: 'Updated Name' } as any);

      await service.update(1, updateDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
    });

    it('should return the updated user without the password', async () => {
      jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, name: 'Updated Name' } as any);

      const result = await service.update(1, updateDto);

      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({ name: 'Updated Name' });
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      jest.spyOn(prisma.user, 'update').mockRejectedValue(new Error('Record not found'));

      await expect(service.update(99, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePassword', () => {
    it('should update the password for the given userId', async () => {
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser as any);

      await service.updatePassword(1, 'new_hashed_password');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'new_hashed_password' },
      });
    });
  });

  describe('delete', () => {
    it('should delete the user by id', async () => {
      jest.spyOn(prisma.user, 'delete').mockResolvedValue(mockUser as any);

      await service.delete(1);

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return the deleted user without the password', async () => {
      jest.spyOn(prisma.user, 'delete').mockResolvedValue(mockUser as any);

      const result = await service.delete(1);

      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({ id: mockUser.id, username: mockUser.username });
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      jest.spyOn(prisma.user, 'delete').mockRejectedValue(new Error('Record not found'));

      await expect(service.delete(99)).rejects.toThrow(NotFoundException);
    });
  });
});
