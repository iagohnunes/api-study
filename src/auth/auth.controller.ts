import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

    // Rota protegida - só funciona com token válido
  @UseGuards(JwtAuthGuard)  // ← Guard protege a rota
  @Get('profile')
  getProfile(@CurrentUser() user) {  // ← Decorator pega o usuário
    // user = dados retornados pela JwtStrategy
    return {
      message: 'Dados do usuário logado',
      user,
    };
  }
}
