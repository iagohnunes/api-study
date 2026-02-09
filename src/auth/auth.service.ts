import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { use } from 'passport';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // 1. Verificar se o email já existe
    const existingUser = await this.prisma.user.findFirst({
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
    const user = await this.prisma.user.create({
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
    const user = await this.prisma.user.findFirst({
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

    const accessToken = this.jwtService.sign(payload);

    // 5. Retornar token + dados do usuário
    return {
        acceee_token: accessToken,
        use: {
            id: user.id,
            name: user.name,
            email: user.auth_identities[0].email,
            status: user.status
        }
    }
  }
}
