import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHello() {
    return await this.prisma.$transaction(async (cursor) => {
      return cursor.teste.findMany();
    });
  }

  
  async insert() {
    await this.prisma.$transaction(async (cursor) => {
      const random = Math.floor(Math.random() * 100);
      await cursor.teste.create({ data: { descricao: 'Barco '+random } });
    });
  }
}
