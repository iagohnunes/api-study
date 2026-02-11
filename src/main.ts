import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração de CORS - Permite requisições do frontend
  app.enableCors({
    origin: [
      'http://localhost:5173', // Vite dev server (local)
      'https://study-front.vercel.app', // Vercel (produção) - AJUSTE SE NECESSÁRIO
      /\.vercel\.app$/, // Qualquer subdomínio do Vercel
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true, // Permite envio de cookies/headers de autenticação
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Aplica JwtAuthGuard em TODAS as rotas da aplicação
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
