import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

// Este Guard usa automaticamente a JwtStrategy que criamos
// Ele verifica se o token JWT no header é válido
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    // AuthGuard('jwt') procura pela Strategy com nome 'jwt'
    // Por padrão, PassportStrategy(Strategy) tem nome 'jwt'

    // Se o token for válido, a request continua
    // Se inválido, retorna 401 Unauthorized automaticamente
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verifica se a rota tem o decorator @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Se for pública, permite acesso
    if (isPublic) {
      return true;
    }
    
    // Se não for pública, valida JWT normalmente
    return super.canActivate(context);
  }
}