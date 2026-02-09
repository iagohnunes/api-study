import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Decorator personalizado para pegar o usuário logado
export const CurrentUser = createParamDecorator(
  // data = parâmetro passado no decorator (ex: @CurrentUser('id'))
  // ctx = contexto da requisição (contém request, response, etc)
  (data: unknown, ctx: ExecutionContext) => {
    // Pega o objeto request da requisição HTTP
    const request = ctx.switchToHttp().getRequest();
    
    // request.user foi preenchido pela JwtStrategy
    // Retorna o usuário completo
    return request.user;
  },
);