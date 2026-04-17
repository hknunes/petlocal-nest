import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext, UnauthorizedException, ConflictException } from '@nestjs/common';
import request from 'supertest';
import { AuthGuard } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '@prisma/client';

const mockUser = { userId: 1, username: 'testuser', email: 'test@mail.com', roles: [UserRole.OWNER] };

class MockJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  }
}

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(MockJwtGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    const validDto = {
      name: 'Test User',
      username: 'testuser',
      email: 'test@mail.com',
      password: 'password123',
      roles: [UserRole.OWNER],
    };

    it('should return 400 when the body is empty', async () => {
      return request(app.getHttpServer()).post('/auth/register').send({}).expect(400);
    });

    it('should return 400 when email is invalid', async () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validDto, email: 'not-an-email' })
        .expect(400);
    });

    it('should return 400 when password is too short', async () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validDto, password: '123' })
        .expect(400);
    });

    it('should return 400 when roles contains an invalid value', async () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validDto, roles: ['INVALID_ROLE'] })
        .expect(400);
    });

    it('should return 409 when the username is already taken', async () => {
      jest.spyOn(authService, 'register').mockRejectedValue(
        new ConflictException('Este username já está em utilização'),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validDto)
        .expect(409);

      expect(response.body.message).toBe('Este username já está em utilização');
    });

    it('should return 201 with access_token on successful registration', async () => {
      const mockResult = { access_token: 'mock_token', user: { id: 1, email: validDto.email, roles: validDto.roles } };
      jest.spyOn(authService, 'register').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validDto)
        .expect(201);

      expect(response.body).toEqual(mockResult);
    });
  });

  describe('POST /auth/login', () => {
    const validDto = { username: 'testuser', password: 'password123' };

    it('should return 400 when the body is empty', async () => {
      return request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
    });

    it('should return 400 when username is missing', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('should return 401 when credentials are invalid', async () => {
      jest.spyOn(authService, 'login').mockRejectedValue(
        new UnauthorizedException('Credenciais inválidas'),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validDto)
        .expect(401);

      expect(response.body.message).toBe('Credenciais inválidas');
    });

    it('should call authService.login with username and password', async () => {
      jest.spyOn(authService, 'login').mockResolvedValue({ access_token: 'mock_token' });

      await request(app.getHttpServer()).post('/auth/login').send(validDto).expect(200);

      expect(authService.login).toHaveBeenCalledWith(validDto.username, validDto.password);
    });

    it('should return 200 with access_token on successful login', async () => {
      jest.spyOn(authService, 'login').mockResolvedValue({ access_token: 'mock_token' });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validDto)
        .expect(200);

      expect(response.body).toEqual({ access_token: 'mock_token' });
    });
  });

  describe('GET /auth/profile', () => {
    it('should return the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(200);

      expect(response.body).toEqual(mockUser);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should return 400 when email is invalid', async () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('should return 400 when body is empty', async () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });

    it('should return 200 with a success message', async () => {
      const mockResult = { message: 'Se o email existir, um link de recuperação foi enviado.' };
      jest.spyOn(authService, 'forgotPassword').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@mail.com' })
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should call authService.forgotPassword with the email', async () => {
      jest.spyOn(authService, 'forgotPassword').mockResolvedValue({ message: 'ok' });

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@mail.com' });

      expect(authService.forgotPassword).toHaveBeenCalledWith('test@mail.com');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should return 400 when newPassword is too short', async () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .query({ token: 'some_token' })
        .send({ newPassword: '123' })
        .expect(400);
    });

    it('should return 400 when body is empty', async () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .query({ token: 'some_token' })
        .send({})
        .expect(400);
    });

    it('should return 401 when the token is invalid', async () => {
      jest.spyOn(authService, 'resetPassword').mockRejectedValue(
        new UnauthorizedException('Token inválido'),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .query({ token: 'bad_token' })
        .send({ newPassword: 'newpass123' })
        .expect(401);

      expect(response.body.message).toBe('Token inválido');
    });

    it('should call authService.resetPassword with token and newPassword', async () => {
      jest.spyOn(authService, 'resetPassword').mockResolvedValue({ message: 'ok' });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .query({ token: 'valid_token' })
        .send({ newPassword: 'newpass123' });

      expect(authService.resetPassword).toHaveBeenCalledWith('valid_token', 'newpass123');
    });

    it('should return 200 with a success message', async () => {
      const mockResult = { message: 'Password atualizada com sucesso!' };
      jest.spyOn(authService, 'resetPassword').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .query({ token: 'valid_token' })
        .send({ newPassword: 'newpass123' })
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });
  });
});
