import { Controller, Get, Query } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('investments/portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  /**
   * GET /investments/portfolio
   * Retorna o portfólio completo do usuário
   */
  @Get()
  getPortfolio(@CurrentUser() user: any) {
    return this.portfolioService.getPortfolio(user.id);
  }

  /**
   * GET /investments/portfolio/summary
   * Resumo geral: total investido, distribuição por tipo
   */
  @Get('summary')
  getSummary(@CurrentUser() user: any) {
    return this.portfolioService.getSummary(user.id);
  }

  /**
   * GET /investments/portfolio/by-type?type=ACAO
   * Filtra ativos por tipo
   */
  @Get('by-type')
  getByType(
    @Query('type') type: string,
    @CurrentUser() user: any,
  ) {
    return this.portfolioService.getByType(user.id, type);
  }
}