import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express'; // 👈 Importante: vem do express

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // 1. Tipamos explicitamente a constante 'request'
    const request = ctx.switchToHttp().getRequest<Request>();

    // 2. Agora o TS sabe que 'request' é um objeto de pedido HTTP.
    // O 'user' ainda pode ser 'any' no Express, por isso fazemos um cast seguro:
    const user = request.user as Record<string, any> | undefined;

    return user;
  },
);
