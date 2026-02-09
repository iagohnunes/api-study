import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  // Refresh token que foi retornado no login
  @IsString({ message: 'Refresh token deve ser uma string' })
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  refresh_token: string;
}