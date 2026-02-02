# ---- build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copie o schema antes do build (pra poder gerar o client)
COPY prisma ./prisma

COPY . .

# Gera o client do Prisma (isso cria os exports PrismaClient/Prisma e os models)
RUN npx prisma generate

RUN npm run build

# ---- production stage ----
FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# precisa do prisma/ se você roda migrations ou generate em runtime (opcional)
COPY prisma ./prisma

COPY --from=builder /app/dist ./dist

# às vezes é útil também copiar o prisma client gerado:
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]
