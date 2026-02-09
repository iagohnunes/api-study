import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user) {  // ← Decorator pega o usuário
    // user = dados retornados pela JwtStrategy
    return {
      message: 'Dados do usuário logado',
      user,
    };
  }

  // Rota para renovar o access token
  @Public()
  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  // Rota para fazer logout (revogar refresh token)
  @Post('logout')
  logout(@Body() logoutDto: LogoutDto, @CurrentUser() user) {
    // user.id = ID do usuário logado (vem do JWT)
    // logoutDto.refresh_token = Token a ser revogado
    return this.authService.logout(logoutDto.refresh_token, user.id);
  }
}
