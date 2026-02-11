import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BrapiService } from '../integrations/brapi.service';

@Module({
  imports: [PrismaModule], // Importa Prisma
  controllers: [AssetsController],
  providers: [AssetsService, BrapiService],
})
export class AssetsModule {}
