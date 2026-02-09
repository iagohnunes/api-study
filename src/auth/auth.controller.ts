import { Controller, Post, Body, UseGuards, Get, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { Public } from './decorators/public.decorator';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permissions } from './decorators/permissions.decorator';

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

  // Rota só para ADMIN
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('admin/dashboard')
  adminDashboard(@CurrentUser() user) {
    return {
      message: 'Bem-vindo ao dashboard de administrador!',
      user,
      access: 'Somente ADMIN',
    };
  }

  // Rota para ADMIN ou MODERATOR
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @Get('moderation/queue')
  moderationQueue(@CurrentUser() user) {
    return {
      message: 'Fila de moderação',
      user,
      access: 'ADMIN ou MODERATOR',
    };
  }

  // Rota para qualquer usuário autenticado (sem @Roles)
  @Get('user/settings')
  userSettings(@CurrentUser() user) {
    return {
      message: 'Configurações do usuário',
      user,
      access: 'Qualquer usuário autenticado',
    };
  }

  // Rota que exige permissão específica: users:write
  @UseGuards(PermissionsGuard)
  @Permissions('users:write')
  @Post('test/create-user')
  testCreateUser(@CurrentUser() user) {
    return {
      message: 'Você tem permissão para criar usuários!',
      user,
      requiredPermissions: ['users:write'],
      userPermissions: user.permissions,
    };
  }

  // Rota que exige múltiplas permissões: users:read E users:delete
  @UseGuards(PermissionsGuard)
  @Permissions('users:read', 'users:delete')
  @Delete('test/delete-user')
  testDeleteUser(@CurrentUser() user) {
    return {
      message: 'Você tem permissão para ler E deletar usuários!',
      user,
      requiredPermissions: ['users:read', 'users:delete'],
      userPermissions: user.permissions,
    };
  }

  // Rota combinando Roles E Permissions
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'MODERATOR')
  @Permissions('reports:view')
  @Get('test/admin-reports')
  testAdminReports(@CurrentUser() user) {
    return {
      message: 'Você é ADMIN/MODERATOR E tem permissão reports:view!',
      user,
      requiredRoles: ['ADMIN', 'MODERATOR'],
      requiredPermissions: ['reports:view'],
      userRoles: user.roles,
      userPermissions: user.permissions,
    };
  }
}
