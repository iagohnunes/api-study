import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './auth/interceptors/audit.interceptor';
import { AssetsModule } from './investments/assets/assets.module';
import { TransactionsModule } from './investments/transactions/transactions.module';
import { PortfolioModule } from './investments/portfolio/portfolio.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    AssetsModule,
    TransactionsModule,
    PortfolioModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR, useClass: AuditInterceptor
    }
  ],
})
export class AppModule {}
