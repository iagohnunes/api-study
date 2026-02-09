# 🔐 Sistema de Autenticação JWT - NestJS

Sistema completo de autenticação e autorização com JWT, controle de acesso baseado em roles e permissions, e auditoria automática.

## 📋 Índice

- [Características](#-características)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Executando o Projeto](#-executando-o-projeto)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Documentação da API](#-documentação-da-api)
- [Segurança](#-segurança)
- [Licença](#-licença)

---

## ✨ Características

### Autenticação
- ✅ Registro de usuários com validação
- ✅ Login com email e senha
- ✅ Access Token (JWT) com expiração curta (15 minutos)
- ✅ Refresh Token com expiração longa (7 dias)
- ✅ Logout com revogação de refresh token
- ✅ Proteção automática de rotas (Guard Global)

### Controle de Acesso
- ✅ Sistema de **Roles** (Papéis): ADMIN, USER, MODERATOR
- ✅ Sistema de **Permissions** (Permissões granulares)
- ✅ Guards customizados (@Roles, @Permissions)
- ✅ Combinação de roles e permissions na mesma rota

### Segurança
- ✅ Senhas hasheadas com **bcrypt** (salt rounds: 10)
- ✅ Refresh tokens com **hash SHA256** no banco
- ✅ Validação de usuários bloqueados/deletados
- ✅ Tokens JWT assinados com secret
- ✅ Revogação de tokens no banco

### Auditoria
- ✅ Log automático de todas as ações críticas
- ✅ Registro de: user_id, action, IP, user_agent, timestamp
- ✅ Metadados em JSON (status HTTP, método, erros)
- ✅ Histórico completo rastreável

---

## 🛠️ Tecnologias

- **[NestJS](https://nestjs.com/)** - Framework Node.js progressivo
- **[Prisma](https://www.prisma.io/)** - ORM moderno para TypeScript
- **[PostgreSQL](https://www.postgresql.org/)** - Banco de dados relacional
- **[Supabase](https://supabase.com/)** - Backend as a Service
- **[JWT](https://jwt.io/)** - JSON Web Tokens para autenticação
- **[Passport](http://www.passportjs.org/)** - Middleware de autenticação
- **[Bcrypt](https://www.npmjs.com/package/bcrypt)** - Hash de senhas

---

## 📦 Pré-requisitos

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** ou **yarn**
- **PostgreSQL** 14+ (ou conta no [Supabase](https://supabase.com/))

---

## 🚀 Instalação

1. **Clone o repositório:**
```bash
git clone <url-do-repositorio>
cd <nome-do-projeto>
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais (veja seção [Configuração](#-configuração))

4. **Execute as migrations do Prisma:**
```bash
npx prisma migrate dev
```

5. **Execute os seeds (dados iniciais):**
```bash
npx prisma db seed
```

---

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Database (Supabase ou PostgreSQL local)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# JWT Secrets (gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=seu_secret_aqui_64_caracteres_aleatorios
JWT_EXPIRES_IN=15m

JWT_REFRESH_SECRET=outro_secret_diferente_64_caracteres
JWT_REFRESH_EXPIRES_IN=7d

# Application
PORT=3000
NODE_ENV=development
```

### Gerando JWT Secrets

Execute no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copie o resultado e cole em `JWT_SECRET` e `JWT_REFRESH_SECRET` (gere dois diferentes).

### Seeds (Dados Iniciais)

O comando `npx prisma db seed` criará:

- **3 Roles:** ADMIN, USER, MODERATOR
- **15 Permissions:** users:read, users:write, users:delete, posts:read, posts:write, posts:delete, comments:read, comments:write, comments:delete, roles:read, roles:write, permissions:read, permissions:write, reports:view, moderation:access

**Relacionamentos:**
- **ADMIN:** Todas as 15 permissions
- **MODERATOR:** 9 permissions (users, posts, comments - read/write/delete)
- **USER:** 6 permissions (posts e comments - read/write/delete)

---

## 🏃 Executando o Projeto

### Desenvolvimento
```bash
npm run start:dev
```

Servidor rodando em: `http://localhost:3000`

### Produção
```bash
npm run build
npm run start:prod
```

### Testes
```bash
npm run test
```

---

## 📁 Estrutura do Projeto

```
src/
├── auth/                        # Módulo de autenticação
│   ├── decorators/              # Decorators customizados
│   │   ├── current-user.decorator.ts    # @CurrentUser()
│   │   ├── public.decorator.ts          # @Public()
│   │   ├── roles.decorator.ts           # @Roles('ADMIN')
│   │   └── permissions.decorator.ts     # @Permissions('users:write')
│   ├── dto/                     # Data Transfer Objects
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   └── logout.dto.ts
│   ├── guards/                  # Guards de proteção
│   │   ├── jwt-auth.guard.ts            # Valida JWT
│   │   ├── roles.guard.ts               # Valida roles
│   │   └── permissions.guard.ts         # Valida permissions
│   ├── interceptors/            # Interceptors
│   │   └── audit.interceptor.ts         # Log automático
│   ├── strategies/              # Passport strategies
│   │   └── jwt.strategy.ts              # Strategy JWT
│   ├── auth.controller.ts       # Endpoints da API
│   ├── auth.service.ts          # Lógica de negócio
│   └── auth.module.ts           # Configuração do módulo
├── prisma/                      # Prisma ORM
│   ├── schema.prisma            # Schema do banco
│   ├── migrations/              # Migrations
│   └── seed.ts                  # Seeds (dados iniciais)
├── users/                       # Módulo de usuários
└── main.ts                      # Entrada da aplicação
```

---

## 📖 Documentação da API

Veja a **[documentação completa da API](./API.md)** com todos os endpoints, exemplos de requisição e resposta.

**Endpoints principais:**

- `POST /auth/register` - Criar conta
- `POST /auth/login` - Fazer login
- `POST /auth/refresh` - Renovar access token
- `GET /auth/profile` - Ver perfil (protegido)
- `POST /auth/logout` - Sair

---

## 🔒 Segurança

Veja o **[guia completo de segurança](./SECURITY.md)** com boas práticas e recomendações.

**Principais medidas de segurança:**

- ✅ Senhas NUNCA são salvas em texto puro (bcrypt)
- ✅ Access tokens de curta duração (15 minutos)
- ✅ Refresh tokens revogáveis no banco
- ✅ Validação de usuários bloqueados/deletados
- ✅ Guard Global (todas as rotas protegidas por padrão)
- ✅ Auditoria completa de ações

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se livre para abrir issues e pull requests.

---

## 📧 Contato

Para dúvidas ou sugestões, entre em contato através de [seu-email@exemplo.com](mailto:seu-email@exemplo.com)

---

**Desenvolvido com ❤️ usando NestJS**
