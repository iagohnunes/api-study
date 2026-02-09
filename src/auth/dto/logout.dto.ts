import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  // Refresh token que será revogado
  @IsString({ message: 'Refresh token deve ser uma string' })
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  refresh_token: string;
}