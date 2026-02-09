import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Pegar as permissions necessárias do decorator @Permissions()
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Se a rota não tem @Permissions(), permite acesso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 3. Pegar o usuário da request (colocado lá pela JwtStrategy)
    const { user } = context.switchToHttp().getRequest();

    // 4. Verificar se usuário tem TODAS as permissions necessárias
    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions?.includes(permission),
    );

    // 5. Se não tem todas as permissions, bloqueia com erro 403 Forbidden
    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Você precisa ter todas essas permissões: ${requiredPermissions.join(', ')}`,
      );
    }

    // 6. Se tem todas as permissions, permite acesso
    return true;
  }
}