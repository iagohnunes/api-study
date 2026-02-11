import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';

// Enum de tipos de transação (deve corresponder ao Prisma)
export enum TransactionType {
  COMPRA = 'COMPRA',
  VENDA = 'VENDA',
  DIVIDENDO = 'DIVIDENDO',
  JCP = 'JCP',
  RENDIMENTO = 'RENDIMENTO',
  BONIFICACAO = 'BONIFICACAO',
  DESDOBRAMENTO = 'DESDOBRAMENTO',
  AGRUPAMENTO = 'AGRUPAMENTO',
}

export class CreateTransactionDto {
  // ID do ativo (obrigatório)
  @IsString()
  @IsNotEmpty()
  asset_id: string;

  // Tipo de transação
  @IsEnum(TransactionType, {
    message: 'Tipo deve ser: COMPRA, VENDA, DIVIDENDO, JCP, RENDIMENTO, BONIFICACAO, DESDOBRAMENTO ou AGRUPAMENTO',
  })
  @IsNotEmpty()
  type: TransactionType;

  // Quantidade (deve ser maior que 0)
  @IsNumber()
  @Min(0.00000001, { message: 'Quantidade deve ser maior que 0' })
  @IsNotEmpty()
  quantity: number;

  // Preço unitário (deve ser maior que 0)
  @IsNumber()
  @Min(0.01, { message: 'Preço deve ser maior que 0' })
  @IsNotEmpty()
  price: number;

  // Taxas (corretagem, custódia, etc) - Opcional, padrão 0
  @IsNumber()
  @Min(0, { message: 'Taxas não podem ser negativas' })
  @IsOptional()
  fees?: number;

  // Data da transação (formato ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
  @IsDateString()
  @IsNotEmpty()
  transaction_date: string;

  // Observações (opcional)
  @IsString()
  @IsOptional()
  notes?: string;
}