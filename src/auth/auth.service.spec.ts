import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '@prisma/client';

const mockUser = {
  id: 1,
  name: 'Test User',
  username: 'testuser',
  email: 'test@mail.com',
  password: 'hashed_password',
  roles: [UserRole.OWNER],
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            findByEmail: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock_token'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException when the user does not exist', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);

      await expect(service.login('unknown', 'pass')).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when the password does not match', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('testuser', 'wrong_pass')).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should return an access_token when credentials are valid', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('testuser', 'correct_pass');

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
        roles: mockUser.roles,
      });
      expect(result).toEqual({ access_token: 'mock_token' });
    });
  });

  describe('register', () => {
    const dto: RegisterDto = {
      name: 'Test User',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'password123',
      roles: [UserRole.OWNER],
    };

    it('should throw ConflictException when the username is already taken', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser as any);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the email is already taken', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should create a user and return an access_token', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(prisma, '$transaction').mockResolvedValue(mockUser as any);

      const result = await service.register(dto);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toMatchObject({ access_token: 'mock_token' });
    });

    it('should return user id, email and roles on register', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(prisma, '$transaction').mockResolvedValue(mockUser as any);

      const result = await service.register(dto);

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        roles: mockUser.roles,
      });
    });

    it('should create a sitterProfile inside the transaction when role includes SITTER', async () => {
      const sitterDto: RegisterDto = { ...dto, roles: [UserRole.SITTER] };
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const txMock = {
        user: { create: jest.fn().mockResolvedValue({ ...mockUser, roles: [UserRole.SITTER] }) },
        sitterProfile: { create: jest.fn().mockResolvedValue({}) },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation((cb: any) => cb(txMock));

      await service.register(sitterDto);

      expect(txMock.sitterProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: mockUser.id }),
        }),
      );
    });

    it('should NOT create a sitterProfile when role is OWNER only', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const txMock = {
        user: { create: jest.fn().mockResolvedValue(mockUser) },
        sitterProfile: { create: jest.fn() },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation((cb: any) => cb(txMock));

      await service.register(dto);

      expect(txMock.sitterProfile.create).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should throw NotFoundException when the email does not exist', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(service.forgotPassword('unknown@mail.com')).rejects.toThrow(NotFoundException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should generate a reset token with type "reset" and 15m expiry', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);

      await service.forgotPassword('test@mail.com');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockUser.id, type: 'reset' },
        { expiresIn: '15m' },
      );
    });

    it('should return a success message', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);

      const result = await service.forgotPassword('test@mail.com');

      expect(result).toEqual({ message: 'Se o email existir, um link de recuperação foi enviado.' });
    });
  });

  describe('resetPassword', () => {
    it('should throw UnauthorizedException when the token is invalid', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('invalid token'));

      await expect(service.resetPassword('bad_token', 'newpass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the token type is not "reset"', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 1, type: 'access' } as any);

      await expect(service.resetPassword('wrong_type_token', 'newpass')).rejects.toThrow(UnauthorizedException);
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('should update the password when the token is valid', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: mockUser.id, type: 'reset' } as any);
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser as any);

      await service.resetPassword('valid_token', 'newpass123');

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ password: expect.any(String) }),
      );
    });

    it('should return a success message after password reset', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: mockUser.id, type: 'reset' } as any);
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser as any);

      const result = await service.resetPassword('valid_token', 'newpass123');

      expect(result).toEqual({ message: 'Password atualizada com sucesso!' });
    });
  });
});
