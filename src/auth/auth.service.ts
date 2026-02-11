import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // 1. Verificar se o email já existe
    const existingUser = await this.prisma.users.findFirst({
      where: {
        auth_identities: {
          some: { email },
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // 2. Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Criar o usuário
    const user = await this.prisma.users.create({
      data: {
        name,
        status: 'PENDING',
        auth_identities: {
          create: {
            provider: 'EMAIL',
            email,
            password_hash: hashedPassword,
          },
        },
      },
      include: {
        auth_identities: {
          select: {
            email: true,
            provider: true,
          },
        },
      },
    });

    // 4. Retornar usuário (sem a senha)
    return {
      id: user.id,
      name: user.name,
      email: user.auth_identities[0].email,
      status: user.status,
    };
  }

  async login(lodinDto: LoginDto) {
    const { email, password } = lodinDto;

    // 1. Buscar usuário pelo email
    const user = await this.prisma.users.findFirst({
      where: {
        auth_identities: {
          some: {
            email,
            provider: 'EMAIL',
          },
        },
      },
      include: {
        auth_identities: {
          where: {
            provider: 'EMAIL',
          },
          select: {
            email: true,
            password_hash: true,
          },
        },
      },
    });

    // 2. Verificar se usuário existe
    if (!user || user.auth_identities.length === 0) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 3. Comparar senha
    const passwordMatch = await bcrypt.compare(
      password,
      user.auth_identities[0].password_hash!,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 4. Gerar JWT token
    const payload = {
      sub: user.id,
      email: user.auth_identities[0].email,
      name: user.name,
    };

    const access_token = await this.jwtService.signAsync(payload);

    // 5. Gerar Refresh Token (expira em 7 dias)
    const refreshTokenString = crypto.randomBytes(64).toString('hex'); // Token aleatório
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenString)
      .digest('hex'); // Hash do token

    // 6. Calcular data de expiração (7 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 7. Salvar refresh token no banco
    await this.prisma.refresh_tokens.create({
      data: {
        user_id: user.id,
        token_hash: refreshTokenHash,
        expires_at: expiresAt,
      },
    });

    // 8. Retornar ambos os tokens + dados do usuário
    return {
      access_token,
      refresh_token: refreshTokenString, // Token original (não o hash!)
      user: {
        id: user.id,
        name: user.name,
        email: user.auth_identities[0].email,
        status: user.status,
      },
    };
  }

  // Método para renovar o access token usando refresh token
  async refreshToken(refreshToken: string) {
    // 1. Fazer hash do token recebido (mesmo processo do login)
    const refresh_token = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // 2. Buscar refresh token no banco pelo hash
    const storedToken = await this.prisma.refresh_tokens.findUnique({
      where: {
        token_hash: refresh_token,
      },
      include: {
        users: {
          include: {
            auth_identities: {
              where: {
                provider: 'EMAIL',
              },
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    // 3. Validar se token existe
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // 4. Validar se token não foi revogado
    if (storedToken.revoked_at) {
      throw new UnauthorizedException('Refresh token foi revogado');
    }

    // 5. Validar se token não expirou
    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    // 6. Validar se usuário ainda existe e está ativo
    const user = storedToken.users;

    if (!user || user.status === 'BLOCKED') {
      throw new UnauthorizedException('Usuário inválido ou bloqueado');
    }

    // 7. Pegar email do usuário
    const email = user.auth_identities[0]?.email;

    if (!email) {
      throw new UnauthorizedException('Email não encontrado');
    }

    // 8. Gerar NOVO access token
    const payload = { sub: user.id, email: email, name: user.name };
    const access_token = await this.jwtService.signAsync(payload);

    // 9. Retornar novo access token
    // (Refresh token continua o mesmo e válido por 7 dias)
    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: email,
        status: user.status,
      },
    };
  }

  // Método para fazer logout
  async logout(refreshToken: string, userId: string) {
    // 1. Fazer hash do refresh token recebido
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // 2. Buscar o refresh token no banco
    const storedToken = await this.prisma.refresh_tokens.findFirst({
      where: {
        token_hash: tokenHash,
        user_id: userId,
      },
    });

    // 3. Se token não existe, está tudo bem (já foi revogado ou não existe)
    if (!storedToken) {
      return {
        message: 'Logout realizado com sucesso',
      };
    }

    // 4. Revogar o token (marcar como revogado)
    await this.prisma.refresh_tokens.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revoked_at: new Date(), // Data/hora atual
      },
    });

    // 5. Retornar mensagem de sucesso
    return {
      message: 'Logout realizado com sucesso',
    };
  }
}
