import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Pegar dados da requisição
    const user = request.user; // Usuário logado (se houver)
    const method = request.method; // GET, POST, PUT, DELETE
    const url = request.url; // /auth/login, /users/123
    const ip = request.ip || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // Executar a rota e depois logar
    return next.handle().pipe(
      tap({
        next: async (data) => {
          // Determinar a ação baseado na rota e método
          const action = this.determineAction(method, url);

          // Para LOGIN e REGISTER, pegar user_id da resposta
          let userId = user?.id;
          if ((action === 'LOGIN' || action === 'REGISTER') && data?.user?.id) {
            userId = data.user.id;
          }

          // Se for uma ação importante E tiver userId, registrar no banco
          if (action && userId) {
            try {
              await this.prisma.audit_logs.create({
                data: {
                  user_id: userId,
                  action: action,
                  resource: url,
                  ip: ip,
                  user_agent: userAgent,
                  metadata: { 
                    status: response.statusCode,
                    method: method,
                  },
                },
              });
            } catch (error) {
              // Se falhar ao logar, não quebra a aplicação
              console.error('❌ Erro ao criar audit log:', error);
            }
          }
        },
        error: async (error) => {
          // Logar também se der erro
          const action = this.determineAction(method, url);

          if (action && user) {
            try {
              await this.prisma.audit_logs.create({
                data: {
                  user_id: user.id,
                  action: action,
                  resource: url,
                  ip: ip,
                  user_agent: userAgent,
                  metadata: { 
                    status: error.status || 500,
                    method: method,
                    error: error.message,
                  },
                },
              });
            } catch (logError) {
              console.error('❌ Erro ao criar audit log:', logError);
            }
          }
        },
      }),
    );
  }

  // Determina qual ação foi realizada baseado na rota e método
  private determineAction(method: string, url: string): string | null {
    // Login
    if (url.includes('/auth/login') && method === 'POST') {
      return 'LOGIN';
    }

    // Logout
    if (url.includes('/auth/logout') && method === 'POST') {
      return 'LOGOUT';
    }

    // Register
    if (url.includes('/auth/register') && method === 'POST') {
      return 'REGISTER';
    }

    // Operações com usuários
    if (url.includes('/users')) {
      if (method === 'POST') return 'CREATE_USER';
      if (method === 'PUT' || method === 'PATCH') return 'UPDATE_USER';
      if (method === 'DELETE') return 'DELETE_USER';
    }

    // Operações importantes com roles/permissions
    if (url.includes('/roles') || url.includes('/permissions')) {
      if (method === 'POST') return 'CREATE_ROLE_OR_PERMISSION';
      if (method === 'PUT' || method === 'PATCH') return 'UPDATE_ROLE_OR_PERMISSION';
      if (method === 'DELETE') return 'DELETE_ROLE_OR_PERMISSION';
    }

    // Acessos a rotas protegidas importantes
    if (url.includes('/admin/dashboard')) return 'ACCESS_ADMIN_DASHBOARD';
    if (url.includes('/moderation/queue')) return 'ACCESS_MODERATION_QUEUE';

    // Não logar ações de leitura simples (GET) para não poluir o banco
    return null;
  }
}
