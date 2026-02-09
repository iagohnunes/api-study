# 📖 Documentação da API

Documentação completa de todos os endpoints do sistema de autenticação.

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Base URL](#-base-url)
- [Autenticação](#-autenticação)
- [Endpoints Públicos](#-endpoints-públicos)
  - [Register](#1-register---criar-conta)
  - [Login](#2-login---fazer-login)
  - [Refresh Token](#3-refresh-token---renovar-access-token)
- [Endpoints Protegidos](#-endpoints-protegidos)
  - [Profile](#1-profile---ver-perfil-do-usuário)
  - [Logout](#2-logout---sair-e-revogar-token)
- [Endpoints com Roles](#-endpoints-com-roles)
- [Endpoints com Permissions](#-endpoints-com-permissions)
- [Códigos de Status HTTP](#-códigos-de-status-http)
- [Exemplos de Erro](#-exemplos-de-erro)

---

## 🌐 Visão Geral

A API usa **JSON** para todas as requisições e respostas.

**Header obrigatório em todas as requisições:**
```
Content-Type: application/json
```

**Header obrigatório em rotas protegidas:**
```
Authorization: Bearer {access_token}
```

---

## 🔗 Base URL

```
http://localhost:3000
```

---

## 🔐 Autenticação

Este sistema usa **JWT (JSON Web Tokens)** para autenticação.

### Fluxo de Autenticação:

1. **Registro/Login** → Recebe `access_token` (15min) + `refresh_token` (7 dias)
2. **Usar access_token** → Incluir no header `Authorization: Bearer {token}`
3. **Access token expira** → Usar `refresh_token` para gerar novo `access_token`
4. **Logout** → Revoga o `refresh_token` no servidor

### Tipos de Token:

- **Access Token (JWT):**
  - Validade: 15 minutos
  - Usado em todas as requisições protegidas
  - Não pode ser revogado (expira automaticamente)
  
- **Refresh Token:**
  - Validade: 7 dias
  - Usado apenas para renovar access token
  - Pode ser revogado no logout

---

## 🌍 Endpoints Públicos

Não requerem autenticação.

---

### 1. Register - Criar Conta

Cria uma nova conta de usuário.

**Endpoint:**
```http
POST /auth/register
```

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Validações:**
- `name`: obrigatório, string
- `email`: obrigatório, formato de email válido
- `password`: obrigatório, mínimo 6 caracteres

**Resposta de Sucesso (201 Created):**
```json
{
  "id": "clx1a2b3c4d5e6f7g8h9i0j1",
  "name": "João Silva",
  "email": "joao@example.com",
  "status": "ACTIVE",
  "created_at": "2025-02-09T12:00:00.000Z"
}
```

**Erros Possíveis:**

- **409 Conflict** - Email já está em uso
```json
{
  "statusCode": 409,
  "message": "Email já está em uso",
  "error": "Conflict"
}
```

- **400 Bad Request** - Dados inválidos
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

---

### 2. Login - Fazer Login

Autentica o usuário e retorna tokens de acesso.

**Endpoint:**
```http
POST /auth/login
```

**Body:**
```json
{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6...",
  "user": {
    "id": "clx1a2b3c4d5e6f7g8h9i0j1",
    "name": "João Silva",
    "email": "joao@example.com",
    "status": "ACTIVE"
  }
}
```

**Tokens:**
- `access_token`: Usar em rotas protegidas (válido por 15 minutos)
- `refresh_token`: Guardar com segurança para renovar access token (válido por 7 dias)

**Erros Possíveis:**

- **401 Unauthorized** - Credenciais inválidas
```json
{
  "statusCode": 401,
  "message": "Credenciais inválidas",
  "error": "Unauthorized"
}
```

**Por que "Credenciais inválidas" genérico?**
Por segurança, não revelamos se o email existe ou se apenas a senha está errada.

---

### 3. Refresh Token - Renovar Access Token

Gera um novo access token usando o refresh token.

**Endpoint:**
```http
POST /auth/refresh
```

**Body:**
```json
{
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6..."
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1a2b3c4d5e6f7g8h9i0j1",
    "name": "João Silva",
    "email": "joao@example.com",
    "status": "ACTIVE"
  }
}
```

**Importante:**
- Retorna apenas **novo access_token** (não gera novo refresh_token)
- Refresh token original continua válido até expirar ou ser revogado
- Esta rota é **pública** (não precisa de access token válido)

**Erros Possíveis:**

- **401 Unauthorized** - Refresh token inválido, expirado ou revogado
```json
{
  "statusCode": 401,
  "message": "Refresh token inválido ou expirado",
  "error": "Unauthorized"
}
```

---

## 🔒 Endpoints Protegidos

Requerem `Authorization: Bearer {access_token}` no header.

---

### 1. Profile - Ver Perfil do Usuário

Retorna dados do usuário logado.

**Endpoint:**
```http
GET /auth/profile
```

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso (200 OK):**
```json
{
  "id": "clx1a2b3c4d5e6f7g8h9i0j1",
  "name": "João Silva",
  "email": "joao@example.com",
  "status": "ACTIVE",
  "roles": ["USER"],
  "permissions": [
    "posts:read",
    "posts:write",
    "posts:delete",
    "comments:read",
    "comments:write",
    "comments:delete"
  ]
}
```

**Erros Possíveis:**

- **401 Unauthorized** - Token ausente, inválido ou expirado
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### 2. Logout - Sair e Revogar Token

Revoga o refresh token no servidor.

**Endpoint:**
```http
POST /auth/logout
```

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6..."
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

**O que acontece no logout:**
1. Refresh token é marcado como `revoked` no banco
2. Não pode mais ser usado para gerar novos access tokens
3. Access token atual continua válido até expirar (15 minutos)

**Erros Possíveis:**

- **401 Unauthorized** - Token ausente, inválido ou expirado
- **404 Not Found** - Refresh token não encontrado

---

## 👥 Endpoints com Roles

Requerem autenticação + role específica.

---

### Admin Dashboard

Apenas usuários com role **ADMIN** podem acessar.

**Endpoint:**
```http
GET /auth/admin/dashboard
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Decorator usado no código:**
```typescript
@Roles('ADMIN')
```

**Resposta (200 OK):**
```json
{
  "message": "Bem-vindo ao painel administrativo",
  "user": {
    "id": "...",
    "name": "Admin User",
    "roles": ["ADMIN"]
  }
}
```

**Erro (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Você não tem as roles necessárias",
  "error": "Forbidden"
}
```

---

### Moderation Queue

Usuários com role **ADMIN** OU **MODERATOR** podem acessar.

**Endpoint:**
```http
GET /auth/moderation/queue
```

**Decorator usado:**
```typescript
@Roles('ADMIN', 'MODERATOR')
```

**Lógica:** Basta ter **UMA** das roles listadas.

---

## 🔑 Endpoints com Permissions

Requerem autenticação + permissions específicas.

---

### Create User

Requer permission **users:write**.

**Endpoint:**
```http
POST /auth/test/create-user
```

**Decorator usado:**
```typescript
@Permissions('users:write')
```

**Resposta (200 OK):**
```json
{
  "message": "Usuário criado com sucesso (simulado)",
  "permissions": ["users:write"]
}
```

**Erro (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Você não tem as permissões necessárias",
  "error": "Forbidden"
}
```

---

### Delete User

Requer **AMBAS** permissions: **users:read** E **users:delete**.

**Endpoint:**
```http
DELETE /auth/test/delete-user
```

**Decorator usado:**
```typescript
@Permissions('users:read', 'users:delete')
```

**Lógica:** Precisa ter **TODAS** as permissions listadas.

---

### Admin Reports (Combinação)

Requer (role **ADMIN** OU **MODERATOR**) E permission **reports:view**.

**Endpoint:**
```http
GET /auth/test/admin-reports
```

**Decorators usados:**
```typescript
@Roles('ADMIN', 'MODERATOR')
@Permissions('reports:view')
```

**Lógica:** Precisa ter role E permission.

---

## 📊 Códigos de Status HTTP

| Código | Significado | Quando ocorre |
|--------|-------------|---------------|
| **200** | OK | Requisição bem-sucedida |
| **201** | Created | Recurso criado (register) |
| **400** | Bad Request | Dados inválidos (validação falhou) |
| **401** | Unauthorized | Token ausente/inválido/expirado, credenciais erradas |
| **403** | Forbidden | Sem permissão (role/permission) |
| **404** | Not Found | Recurso não encontrado |
| **409** | Conflict | Conflito (email duplicado) |
| **500** | Internal Server Error | Erro no servidor |

---

## ⚠️ Exemplos de Erro

### Validação de Dados (400)

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

### Token Ausente (401)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Token Expirado (401)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Sem Role Necessária (403)

```json
{
  "statusCode": 403,
  "message": "Você não tem as roles necessárias",
  "error": "Forbidden"
}
```

### Sem Permission Necessária (403)

```json
{
  "statusCode": 403,
  "message": "Você não tem as permissões necessárias",
  "error": "Forbidden"
}
```

---

## 🔄 Fluxo Completo de Uso

### 1. Criar Conta
```http
POST /auth/register
{
  "name": "João",
  "email": "joao@example.com",
  "password": "senha123"
}
```

### 2. Fazer Login
```http
POST /auth/login
{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "a1b2c3...",
  "user": {...}
}
```

### 3. Acessar Rota Protegida
```http
GET /auth/profile
Headers:
  Authorization: Bearer eyJ...
```

### 4. Access Token Expira (15min)
```http
POST /auth/refresh
{
  "refresh_token": "a1b2c3..."
}
```

**Resposta:**
```json
{
  "access_token": "eyJ...", // Novo token
  "user": {...}
}
```

### 5. Fazer Logout
```http
POST /auth/logout
Headers:
  Authorization: Bearer eyJ...
Body:
{
  "refresh_token": "a1b2c3..."
}
```

---

## 📝 Notas Importantes

1. **Access Token vs Refresh Token:**
   - Access token: curta duração, usado em requisições
   - Refresh token: longa duração, usado apenas para renovar

2. **Segurança:**
   - NUNCA envie refresh token em URLs ou query params
   - Guarde refresh token com segurança (httpOnly cookie, secure storage)
   - Access token pode ser em localStorage (expira rápido)

3. **Headers:**
   - Authorization: `Bearer {token}` (com espaço após "Bearer")
   - Content-Type: `application/json`

4. **Erros Genéricos:**
   - "Credenciais inválidas" não revela se email existe (segurança)
   - "Unauthorized" não revela motivo específico do token inválido

---

**Para mais informações sobre segurança, veja [SECURITY.md](./SECURITY.md)**
