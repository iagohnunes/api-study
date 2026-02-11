import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';

// UpdateTransactionDto é igual ao CreateTransactionDto, mas todos os campos opcionais
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}