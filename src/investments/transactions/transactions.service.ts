import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cria uma nova transação e atualiza o portfólio
   */
  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const { asset_id, type, quantity, price, fees = 0, transaction_date, notes } = createTransactionDto;

    // Verifica se o ativo existe e pertence ao usuário
    const asset = await this.prisma.assets.findFirst({
      where: {
        id: asset_id,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Ativo não encontrado ou não pertence a você`);
    }

    // Calcula valor total da transação
    // COMPRA: (quantity × price) + fees
    // VENDA: (quantity × price) - fees
    let totalValue: number;
    if (type === 'COMPRA') {
      totalValue = quantity * price + fees;
    } else if (type === 'VENDA') {
      totalValue = quantity * price - fees;
    } else {
      // DIVIDENDO, JCP, RENDIMENTO
      totalValue = quantity * price;
    }

    // Se for VENDA, valida se tem quantidade suficiente
    if (type === 'VENDA') {
      const portfolio = await this.prisma.portfolios.findUnique({
        where: {
          user_id_asset_id: {
            user_id: userId,
            asset_id: asset_id,
          },
        },
      });

      if (!portfolio || Number(portfolio.quantity) < quantity) {
        throw new BadRequestException(
          `Você não possui quantidade suficiente deste ativo. Disponível: ${portfolio?.quantity || 0}`,
        );
      }
    }

    // Cria a transação no banco
    const transaction = await this.prisma.transactions.create({
      data: {
        user_id: userId,
        asset_id,
        type,
        quantity: new Prisma.Decimal(quantity),
        price: new Prisma.Decimal(price),
        total_value: new Prisma.Decimal(totalValue),
        fees: new Prisma.Decimal(fees),
        transaction_date: new Date(transaction_date),
        notes,
      },
      include: {
        assets: true, // Inclui dados do ativo na resposta
      },
    });

    // Atualiza o portfólio após a transação
    await this.updatePortfolio(userId, asset_id);

    return transaction;
  }

  /**
   * Atualiza o portfólio após uma transação
   * Recalcula: quantidade, preço médio, total investido
   */
  private async updatePortfolio(userId: string, assetId: string) {
    // Busca todas as transações do ativo (não deletadas)
    const transactions = await this.prisma.transactions.findMany({
      where: {
        user_id: userId,
        asset_id: assetId,
        deleted_at: null,
      },
      orderBy: {
        transaction_date: 'asc',
      },
    });

    let totalQuantity = 0;
    let totalInvested = 0;

    // Calcula quantidade total e valor investido
    for (const trans of transactions) {
      const qty = Number(trans.quantity);
      const price = Number(trans.price);
      const fees = Number(trans.fees);

      if (trans.type === 'COMPRA') {
        totalQuantity += qty;
        totalInvested += qty * price + fees;
      } else if (trans.type === 'VENDA') {
        totalQuantity -= qty;
        // Ao vender, reduz o valor investido proporcionalmente
        const avgPrice = totalInvested / (totalQuantity + qty);
        totalInvested -= qty * avgPrice;
      }
      // DIVIDENDO, JCP, RENDIMENTO não alteram quantidade nem preço médio
    }

    // Calcula preço médio de compra
    const averagePrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

    // Se quantidade zerou, deleta do portfólio
    if (totalQuantity <= 0) {
      await this.prisma.portfolios.deleteMany({
        where: {
          user_id: userId,
          asset_id: assetId,
        },
      });
      return;
    }

    // Atualiza ou cria registro no portfólio
    await this.prisma.portfolios.upsert({
      where: {
        user_id_asset_id: {
          user_id: userId,
          asset_id: assetId,
        },
      },
      update: {
        quantity: new Prisma.Decimal(totalQuantity),
        average_price: new Prisma.Decimal(averagePrice),
        total_invested: new Prisma.Decimal(totalInvested),
      },
      create: {
        user_id: userId,
        asset_id: assetId,
        quantity: new Prisma.Decimal(totalQuantity),
        average_price: new Prisma.Decimal(averagePrice),
        total_invested: new Prisma.Decimal(totalInvested),
      },
    });
  }

  /**
   * Lista todas as transações do usuário
   */
  async findAll(userId: string) {
    return this.prisma.transactions.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      include: {
        assets: true, // Inclui dados do ativo
      },
      orderBy: {
        transaction_date: 'desc', // Mais recentes primeiro
      },
    });
  }

  /**
   * Busca uma transação específica
   */
  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transactions.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null,
      },
      include: {
        assets: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transação não encontrada`);
    }

    return transaction;
  }

  /**
   * Atualiza uma transação
   */
  async update(id: string, updateTransactionDto: UpdateTransactionDto, userId: string) {
    // Verifica se transação existe
    await this.findOne(id, userId);

    const { quantity, price, fees, type } = updateTransactionDto;

    // Recalcula total_value se mudou quantidade, preço ou taxas
    let totalValue: number | undefined;
    if (quantity !== undefined || price !== undefined || fees !== undefined || type !== undefined) {
      const trans = await this.prisma.transactions.findUnique({ where: { id } });
      const newQty = quantity !== undefined ? quantity : Number(trans!.quantity);
      const newPrice = price !== undefined ? price : Number(trans!.price);
      const newFees = fees !== undefined ? fees : Number(trans!.fees);
      const newType = type !== undefined ? type : trans!.type;

      if (newType === 'COMPRA') {
        totalValue = newQty * newPrice + newFees;
      } else if (newType === 'VENDA') {
        totalValue = newQty * newPrice - newFees;
      } else {
        totalValue = newQty * newPrice;
      }
    }

    // Atualiza a transação
    const updated = await this.prisma.transactions.update({
      where: { id },
      data: {
        ...updateTransactionDto,
        quantity: updateTransactionDto.quantity ? new Prisma.Decimal(updateTransactionDto.quantity) : undefined,
        price: updateTransactionDto.price ? new Prisma.Decimal(updateTransactionDto.price) : undefined,
        fees: updateTransactionDto.fees !== undefined ? new Prisma.Decimal(updateTransactionDto.fees) : undefined,
        total_value: totalValue ? new Prisma.Decimal(totalValue) : undefined,
        transaction_date: updateTransactionDto.transaction_date ? new Date(updateTransactionDto.transaction_date) : undefined,
      },
      include: {
        assets: true,
      },
    });

    // Recalcula o portfólio
    await this.updatePortfolio(userId, updated.asset_id);

    return updated;
  }

  /**
   * Remove uma transação (soft delete)
   */
  async remove(id: string, userId: string) {
    const transaction = await this.findOne(id, userId);

    // Soft delete
    const deleted = await this.prisma.transactions.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    // Recalcula o portfólio
    await this.updatePortfolio(userId, transaction.asset_id);

    return deleted;
  }
}
