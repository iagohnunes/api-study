import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Interface para tipar a resposta da Brapi
interface BrapiQuoteResponse {
  results: Array<{
    symbol: string;           // Ticker (ex: PETR4)
    longName: string;         // Nome completo
    regularMarketPrice: number; // Preço atual
    currency: string;         // Moeda (BRL)
    marketCap: number;        // Valor de mercado
    logourl?: string;         // Logo da empresa
  }>;
}

@Injectable()
export class BrapiService {
  private readonly logger = new Logger(BrapiService.name);
  private readonly BASE_URL = 'https://brapi.dev/api';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('BRAPI_API_KEY');
  }

  /**
   * Busca informações de um ativo pelo ticker
   * @param ticker - Código do ativo (ex: PETR4, MXRF11, BTC)
   */
  async getAssetInfo(ticker: string) {
    try {
      this.logger.log(`Buscando informações do ticker: ${ticker}`);

      // Chama a API da Brapi
      const response = await axios.get<BrapiQuoteResponse>(
        `${this.BASE_URL}/quote/${ticker.toUpperCase()}`,
        { params: { token: this.apiKey } },
      );

      // Verifica se encontrou resultado
      if (!response.data.results || response.data.results.length === 0) {
        throw new NotFoundException(`Ticker ${ticker} não encontrado`);
      }

      const asset = response.data.results[0];

      // Detecta o tipo do ativo baseado no ticker
      const type = this.detectAssetType(ticker);

      return {
        ticker: asset.symbol,
        name: asset.longName || asset.symbol,
        type: type,
        currentPrice: asset.regularMarketPrice,
        logoUrl: asset.logourl,
      };
    } catch (error) {
      // Se for erro 404, ticker não existe
      if (error.response?.status === 404) {
        throw new NotFoundException(`Ticker ${ticker} não encontrado na Brapi`);
      }

      // Outros erros
      this.logger.error(`Erro ao buscar ticker ${ticker}:`, error.message);
      throw error;
    }
  }

  /**
   * Detecta o tipo de ativo baseado no ticker
   * Regras:
   * - Termina com 11 → FII
   * - 4 letras + número → Ação
   * - BTC, ETH, etc → Cripto
   */
  private detectAssetType(ticker: string): string {
    const upperTicker = ticker.toUpperCase();

    // Fundos Imobiliários terminam com 11
    if (upperTicker.endsWith('11')) {
      return 'FII';
    }

    // Criptomoedas conhecidas
    const cryptos = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'ADA'];
    if (cryptos.some((crypto) => upperTicker.includes(crypto))) {
      return 'CRIPTO';
    }

    // ETFs geralmente têm "11" no meio ou terminam com números específicos
    if (upperTicker.match(/[A-Z]{4}11/)) {
      return 'ETF';
    }

    // Padrão de ações brasileiras: 4 letras + número
    if (upperTicker.match(/^[A-Z]{4}[0-9]$/)) {
      return 'ACAO';
    }

    // Default: outro
    return 'OUTRO';
  }
}
