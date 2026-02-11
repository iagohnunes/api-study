import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Importa Prisma
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService], // Exporta para usar em outros módulos (Portfolio)
})
export class TransactionsModule {}