import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Pegar as roles necessárias do decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Se a rota não tem @Roles(), permite acesso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Pegar o usuário da request (colocado lá pela JwtStrategy)
    const { user } = context.switchToHttp().getRequest();

    // 4. Verificar se usuário tem alguma das roles necessárias
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    // 5. Se não tem a role, bloqueia com erro 403 Forbidden
    if (!hasRole) {
      throw new ForbiddenException(
        `Você precisa ter uma dessas roles: ${requiredRoles.join(', ')}`,
      );
    }

    // 6. Se tem a role, permite acesso
    return true;
  }
}