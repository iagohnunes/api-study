import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retorna o portfólio completo do usuário
   * Mostra todos os ativos que o usuário possui
   */
  async getPortfolio(userId: string) {
    const portfolio = await this.prisma.portfolios.findMany({
      where: {
        user_id: userId,
      },
      include: {
        assets: true, // Inclui dados do ativo (ticker, nome, tipo)
      },
      orderBy: {
        total_invested: 'desc', // Maior investimento primeiro
      },
    });

    return portfolio;
  }

  /**
   * Resumo geral do portfólio
   */
  async getSummary(userId: string) {
    const portfolio = await this.getPortfolio(userId);

    // Calcula totais
    let totalInvested = 0;
    let totalAssets = portfolio.length;

    // Agrupa por tipo de ativo
    const byType: Record<string, { count: number; invested: number }> = {};

    for (const item of portfolio) {
      const invested = Number(item.total_invested);
      totalInvested += invested;

      const assetType = item.assets.type;
      if (!byType[assetType]) {
        byType[assetType] = { count: 0, invested: 0 };
      }
      byType[assetType].count++;
      byType[assetType].invested += invested;
    }

    // Calcula percentuais
    const distribution = Object.entries(byType).map(([type, data]) => ({
      type,
      count: data.count,
      invested: data.invested,
      percentage: totalInvested > 0 ? (data.invested / totalInvested) * 100 : 0,
    }));

    return {
      totalInvested,
      totalAssets,
      distribution,
    };
  }

  /**
   * Filtra portfólio por tipo de ativo
   */
  async getByType(userId: string, assetType: string) {
    const portfolio = await this.prisma.portfolios.findMany({
      where: {
        user_id: userId,
        assets: {
          type: assetType.toUpperCase() as any,
        },
      },
      include: {
        assets: true,
      },
      orderBy: {
        total_invested: 'desc',
      },
    });

    return portfolio;
  }
}