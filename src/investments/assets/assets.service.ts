import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BrapiService } from '../integrations/brapi.service';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private brapiService: BrapiService,
  ) {}

  /**
   * Cria um novo ativo
   * Se name/type não informados, busca automaticamente na Brapi
   */
  async create(createAssetDto: CreateAssetDto, userId: string) {
    const { ticker, name, type, description } = createAssetDto;

    // Se name ou type não informados, busca na Brapi
    let assetName = name;
    let assetType = type;

    if (!name || !type) {
      const brapiData = await this.brapiService.getAssetInfo(ticker);
      assetName = name || brapiData.name;
      assetType = type || (brapiData.type as any);
    }

    // Verifica se ticker já existe para este usuário
    const existingAsset = await this.prisma.assets.findUnique({
      where: {
        user_id_ticker: {
          user_id: userId,
          ticker: ticker.toUpperCase(),
        },
      },
    });

    if (existingAsset) {
      throw new ConflictException(`Você já possui o ativo ${ticker} cadastrado`);
    }

    // Cria o ativo no banco
    return this.prisma.assets.create({
      data: {
        user_id: userId,
        ticker: ticker.toUpperCase(),
        name: assetName!,
        type: assetType!,
        description,
      },
    });
  }

  /**
   * Lista todos os ativos do usuário (não deletados)
   */
  async findAll(userId: string) {
    return this.prisma.assets.findMany({
      where: {
        user_id: userId,
        deleted_at: null, // Ignora ativos deletados (soft delete)
      },
      orderBy: {
        ticker: 'asc', // Ordena por ticker alfabeticamente
      },
    });
  }

  /**
   * Busca um ativo específico por ID
   */
  async findOne(id: string, userId: string) {
    const asset = await this.prisma.assets.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Ativo com ID ${id} não encontrado`);
    }

    return asset;
  }

  /**
   * Atualiza um ativo
   */
  async update(id: string, updateAssetDto: UpdateAssetDto, userId: string) {
    // Verifica se o ativo existe e pertence ao usuário
    await this.findOne(id, userId);

    // Se mudou o ticker, verifica duplicação
    if (updateAssetDto.ticker) {
      const existingAsset = await this.prisma.assets.findFirst({
        where: {
          user_id: userId,
          ticker: updateAssetDto.ticker.toUpperCase(),
          id: { not: id }, // Ignora o próprio ativo
          deleted_at: null,
        },
      });

      if (existingAsset) {
        throw new ConflictException(
          `Você já possui outro ativo com ticker ${updateAssetDto.ticker}`,
        );
      }
    }

    // Atualiza o ativo
    return this.prisma.assets.update({
      where: { id },
      data: {
        ticker: updateAssetDto.ticker?.toUpperCase(),
        name: updateAssetDto.name,
        type: updateAssetDto.type,
        description: updateAssetDto.description,
      },
    });
  }

  /**
   * Remove um ativo (soft delete)
   */
  async remove(id: string, userId: string) {
    // Verifica se o ativo existe e pertence ao usuário
    await this.findOne(id, userId);

    // Soft delete: apenas marca como deletado
    return this.prisma.assets.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}