import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extrai o token do header 'Authorization: Bearer <token>'
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  // O NestJS chama isto automaticamente se o token for válido
  validate(payload: JwtPayload) {
    // O que retornares aqui será injetado no 'req.user'
    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles,
    };
  }
}

interface JwtPayload {
  sub: number;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
  roles: string[];
}
