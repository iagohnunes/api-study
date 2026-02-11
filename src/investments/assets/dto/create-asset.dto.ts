import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AssetType {
  ACAO = 'ACAO',
  FII = 'FII',
  RENDA_FIXA = 'RENDA_FIXA',
  CRIPTO = 'CRIPTO',
  ETF = 'ETF',
  OUTRO = 'OUTRO',
}

export class CreateAssetDto {
  // Ticker do ativo - ÚNICO CAMPO OBRIGATÓRIO
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  ticker: string;

  // Os campos abaixo são OPCIONAIS
  // Se não informados, o sistema busca na Brapi automaticamente

  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsEnum(AssetType, {
    message: 'Tipo deve ser: ACAO, FII, RENDA_FIXA, CRIPTO, ETF ou OUTRO',
  })
  @IsOptional()
  type?: AssetType;

  @IsString()
  @IsOptional()
  description?: string;
}