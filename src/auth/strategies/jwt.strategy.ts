import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // 1. De onde extrair o token (Header: Authorization: Bearer TOKEN)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 2. Rejeitar tokens expirados
      ignoreExpiration: false,

      // 3. Chave secreta para validar (mesma do módulo)
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // 4. Método chamado automaticamente se o token for válido
  async validate(payload: any) {
    // payload = dados decodificados do token
    // { sub: "user-id", email: "...", name: "...", iat: ..., exp: ... }
    // Buscar usuário no banco para confirmar que ainda existe
    const user = await this.prisma.users.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        auth_identities: {
          select: {
            email: true
          }
        },
        user_roles: {
          select: {
            roles: {
              include: {
                role_permissions: {
                  include: {
                    permissions: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Se usuário não existe mais (foi deletado), bloqueia
    if(!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Se usuário está bloqueado, não permite acesso
    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException('Usuário bloqueado');
    }

    // Extrair nomes das roles
    const roles = user.user_roles.map(ur => ur.roles.name);

    // Extrair permissions (de todas as roles do usuário)
    const permissions = user.user_roles
      .flatMap(ur => ur.roles.role_permissions)  // Pega todas as role_permissions
      .map(rp => rp.permissions.name)  // Extrai o nome da permission
      .filter((value, index, self) => self.indexOf(value) === index);  // Remove duplicadas

    // Retorna dados do usuário (vai ficar disponível nas rotas)
    return {
      id: user.id,
      email: payload.email,
      name: user.name,
      status: user.status,
      roles,
      permissions,
    };
  }
}
