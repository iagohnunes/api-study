# 🔒 Guia de Segurança

Guia completo sobre as práticas de segurança implementadas neste sistema e recomendações de uso.

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Autenticação Segura](#-autenticação-segura)
- [Proteção de Senhas](#-proteção-de-senhas)
- [Tokens JWT](#-tokens-jwt)
- [Refresh Tokens](#-refresh-tokens)
- [Controle de Acesso](#-controle-de-acesso)
- [Auditoria](#-auditoria)
- [Boas Práticas](#-boas-práticas)
- [Configuração de Produção](#-configuração-de-produção)
- [Checklist de Segurança](#-checklist-de-segurança)

---

## 🛡️ Visão Geral

Este sistema implementa **múltiplas camadas de segurança** para proteger dados e acessos:

1. **Autenticação** - JWT com tokens de curta e longa duração
2. **Autorização** - Roles e Permissions granulares
3. **Criptografia** - Senhas com bcrypt, tokens com SHA256
4. **Proteção de Rotas** - Guard Global (segurança por padrão)
5. **Auditoria** - Log automático de todas as ações críticas
6. **Validação** - Dados validados em todas as requisições

---

## 🔐 Autenticação Segura

### Guard Global (Proteção por Padrão)

**Como funciona:**
- Todas as rotas são **protegidas por padrão**
- Use `@Public()` para marcar rotas públicas (exceções)
- Impossível esquecer de proteger uma rota

**Configuração:**

```typescript
// main.ts
const reflector = app.get(Reflector);
app.useGlobalGuards(new JwtAuthGuard(reflector));
```

**Rotas públicas:**
```typescript
@Public()
@Post('register')
register() { ... }
```

**Rotas protegidas (padrão):**
```typescript
@Get('profile')  // Já protegida automaticamente
getProfile() { ... }
```

### Validação de Usuários

**O sistema valida:**
- ✅ Token JWT válido e não expirado
- ✅ Usuário existe no banco
- ✅ Usuário não está bloqueado (`status !== 'BLOCKED'`)
- ✅ Usuário não foi deletado (soft delete)

**Quando um usuário é bloqueado:**
- Não consegue fazer login
- Tokens existentes param de funcionar
- Refresh token não funciona

---

## 🔑 Proteção de Senhas

### Bcrypt com Salt Rounds

**Implementação:**
```typescript
const hashedPassword = await bcrypt.hash(password, 10);
```

**O que significa:**
- **Salt Rounds: 10** - Número de rodadas de hash
- Quanto maior, mais seguro mas mais lento
- 10 é o equilíbrio recomendado para produção

**Como funciona:**
1. Usuário digita: `senha123`
2. Bcrypt gera salt aleatório
3. Bcrypt faz hash com salt
4. Resultado salvo no banco: `$2b$10$XYZ...` (irreversível)

**Verificação:**
```typescript
const isValid = await bcrypt.compare(senhaDigitada, hashDoBanco);
```

### Por que NUNCA salvar senha em texto puro?

**Cenário de ataque:**
- Atacante invade banco de dados
- Se senhas em texto puro → todos os usuários comprometidos
- Com bcrypt → hashes inúteis sem a senha original

**Impossível reverter:**
- `senha123` → `$2b$10$XYZ...` ✅ (hash)
- `$2b$10$XYZ...` → `senha123` ❌ (não existe operação reversa)

---

## 🎫 Tokens JWT

### Estrutura do JWT

**Formato:** `header.payload.signature`

**Exemplo decodificado:**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id_123",
    "email": "user@example.com",
    "name": "João Silva",
    "iat": 1707501600,
    "exp": 1707502500
  },
  "signature": "hash_assinado_com_secret"
}
```

### Segurança do JWT

**JWT_SECRET:**
- Chave secreta que assina o token
- DEVE ter no mínimo 64 caracteres aleatórios
- NUNCA deve ser compartilhada ou commitada no git
- Mudar o secret invalida TODOS os tokens existentes

**Gerar secret seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Validação:**
1. Cliente envia token
2. Servidor verifica assinatura com JWT_SECRET
3. Se assinatura inválida → token foi adulterado
4. Se válido → confia no payload

### Expiração

**Access Token: 15 minutos**
- Por que curto? Minimiza janela de ataque
- Se roubado, expira rápido
- Força renovação frequente

**Configuração:**
```typescript
JWT_EXPIRES_IN=15m  // 15 minutos
```

### Limitações do JWT

**JWT é STATELESS (sem estado):**
- ✅ Escalável (não precisa consultar banco)
- ❌ Não pode ser revogado antes de expirar
- ❌ Se roubado, é válido até expirar

**Solução:** Usar refresh tokens (com estado no banco)

---

## 🔄 Refresh Tokens

### Como Funcionam

**Geração:**
```typescript
const refreshToken = crypto.randomBytes(64).toString('hex'); // 128 caracteres
const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
```

**Por que hash SHA256?**
- Token original (128 chars) enviado ao cliente
- Hash SHA256 salvo no banco
- Se banco vazar → hash inútil sem token original
- Mesma lógica de senha, mas hash diferente

### Armazenamento no Banco

**Tabela `refresh_tokens`:**
```prisma
model RefreshToken {
  id           String    @id @default(cuid())
  user_id      String
  token_hash   String    @unique  // SHA256
  expires_at   DateTime
  revoked_at   DateTime?           // NULL = ativo, timestamp = revogado
  ip           String?
  user_agent   String?
  created_at   DateTime  @default(now())
}
```

### Validações

**Ao usar refresh token:**
1. ✅ Token existe no banco (hash match)
2. ✅ Não foi revogado (`revoked_at IS NULL`)
3. ✅ Não expirou (`expires_at > NOW()`)
4. ✅ Usuário existe e não está bloqueado

### Revogação (Logout)

**Como funciona:**
```typescript
// Marca token como revogado
await prisma.refreshToken.update({
  where: { token_hash: hash },
  data: { revoked_at: new Date() }
});
```

**Efeitos:**
- ✅ Refresh token NÃO pode mais gerar novos access tokens
- ⚠️ Access token atual continua válido até expirar
- 💡 Para invalidar access token imediatamente → blacklist (mais complexo)

### Segurança

**Expiração longa (7 dias):**
- Usuário fica logado por 1 semana
- Não precisa digitar senha toda hora

**Revogável:**
- Logout → revoga token
- Se token roubado → pode revogar
- JWT não revogável → refresh token compensa

**Rotação (Opcional):**
- A cada refresh, gerar NOVO refresh token
- Revogar o anterior
- Ainda mais seguro (não implementado neste sistema)

---

## 🎭 Controle de Acesso

### Roles (Papéis)

**Hierarquia sugerida:**
- **ADMIN** - Todas as permissões
- **MODERATOR** - Moderação de conteúdo
- **USER** - Usuário comum

**Como usar:**
```typescript
@Roles('ADMIN')
deleteUser() { ... }

@Roles('ADMIN', 'MODERATOR')
moderateContent() { ... }
```

**Lógica:** Precisa ter **UMA** das roles (`some()`)

### Permissions (Permissões)

**Granularidade:**
```
users:read
users:write
users:delete
posts:read
posts:write
posts:delete
```

**Como usar:**
```typescript
@Permissions('users:write')
createUser() { ... }

@Permissions('users:read', 'users:delete')
deleteUser() { ... }
```

**Lógica:** Precisa ter **TODAS** as permissions (`every()`)

### Combinação

```typescript
@Roles('ADMIN', 'MODERATOR')
@Permissions('reports:view')
viewReports() { ... }
```

**Lógica:** Precisa ter (ADMIN OU MODERATOR) **E** reports:view

### Princípio do Menor Privilégio

**Sempre dê o MÍNIMO de acesso necessário:**

❌ **Errado:** Todo mundo é ADMIN
```typescript
// Não faça isso!
@Roles('ADMIN')
listUsers() { ... }
```

✅ **Certo:** Permission específica
```typescript
@Permissions('users:read')
listUsers() { ... }
```

---

## 📝 Auditoria

### O que é Registrado

**Todas as ações críticas:**
- LOGIN - Quando usuário faz login
- LOGOUT - Quando usuário faz logout
- REGISTER - Quando novo usuário se registra
- CREATE_USER - Criação de usuário (admin)
- UPDATE_USER - Atualização de usuário
- DELETE_USER - Deleção de usuário
- ACCESS_ADMIN_DASHBOARD - Acesso a áreas administrativas
- E muito mais...

### Dados Capturados

**Para cada ação:**
```json
{
  "user_id": "clx123...",
  "action": "LOGIN",
  "resource": "/auth/login",
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "metadata": {
    "status": 200,
    "method": "POST"
  },
  "created_at": "2025-02-09T12:00:00.000Z"
}
```

### Por que Auditar?

**Segurança:**
- Detectar acessos não autorizados
- Rastrear quem fez o quê e quando
- Investigar incidentes de segurança

**Compliance:**
- LGPD, GDPR exigem logs de acesso a dados
- Rastreabilidade de ações sensíveis

**Debug:**
- Entender problemas de usuários
- Analisar padrões de uso

### Consultas Úteis

**Últimos 10 logins:**
```sql
SELECT 
  u.name, 
  al.ip, 
  al.created_at
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.action = 'LOGIN'
ORDER BY al.created_at DESC
LIMIT 10;
```

**Ações de um usuário específico:**
```sql
SELECT 
  action,
  resource,
  created_at
FROM audit_logs
WHERE user_id = 'clx123...'
ORDER BY created_at DESC;
```

---

## ✅ Boas Práticas

### Cliente (Frontend)

**1. Armazenamento de Tokens**

❌ **Evite:**
```javascript
// Refresh token em localStorage → risco de XSS
localStorage.setItem('refresh_token', token);
```

✅ **Prefira:**
```javascript
// Access token em localStorage (OK - expira rápido)
localStorage.setItem('access_token', token);

// Refresh token em httpOnly cookie (melhor - não acessível por JS)
// Configurar no backend
```

**2. Envio de Tokens**

✅ **Sempre no header:**
```javascript
fetch('/api/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

❌ **NUNCA em URL:**
```javascript
// NÃO FAÇA ISSO!
fetch(`/api/profile?token=${accessToken}`);
```

**3. Renovação Automática**

```javascript
// Interceptor de requisições
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expirou → renovar automaticamente
      const newToken = await refreshAccessToken();
      // Retentar requisição com novo token
    }
    return Promise.reject(error);
  }
);
```

### Backend (API)

**1. Variáveis de Ambiente**

❌ **NUNCA commite .env:**
```bash
# .gitignore
.env
.env.local
.env.production
```

✅ **Use .env.example:**
```env
# .env.example (sem valores reais)
DATABASE_URL=postgresql://...
JWT_SECRET=gere_com_crypto_randomBytes
JWT_EXPIRES_IN=15m
```

**2. Validação de Entrada**

✅ **Sempre valide:**
```typescript
@IsEmail()
@IsNotEmpty()
email: string;

@MinLength(6)
@IsString()
password: string;
```

**3. Rate Limiting (Recomendado)**

```typescript
// Previne ataques de força bruta
import { ThrottlerModule } from '@nestjs/throttler';

ThrottlerModule.forRoot({
  ttl: 60,    // 60 segundos
  limit: 10,  // 10 requisições
}),
```

**4. CORS Configurado**

```typescript
app.enableCors({
  origin: ['https://meusite.com'],
  credentials: true,
});
```

---

## 🚀 Configuração de Produção

### Variáveis de Ambiente

**Produção vs Desenvolvimento:**

```env
# development.env
NODE_ENV=development
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# production.env
NODE_ENV=production
JWT_EXPIRES_IN=5m          # Mais curto
JWT_REFRESH_EXPIRES_IN=1d  # Mais curto
```

### HTTPS Obrigatório

**Em produção, SEMPRE use HTTPS:**
- Tokens trafegam criptografados
- Previne man-in-the-middle attacks

### Logs

**Configure níveis de log:**
```typescript
// Produção: apenas erros
app.useLogger(['error', 'warn']);

// Desenvolvimento: tudo
app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
```

### Backup de Banco

**Auditoria é crítica:**
- Faça backups diários
- Retenha logs por no mínimo 90 dias
- Logs são evidências legais

---

## 📋 Checklist de Segurança

### Antes de Ir para Produção

- [ ] JWT_SECRET tem 64+ caracteres aleatórios
- [ ] JWT_REFRESH_SECRET diferente de JWT_SECRET
- [ ] .env não está no git (.gitignore configurado)
- [ ] HTTPS habilitado
- [ ] CORS configurado corretamente
- [ ] Rate limiting implementado
- [ ] Senhas com bcrypt (salt rounds >= 10)
- [ ] Access token com expiração curta (<= 15min)
- [ ] Guard Global ativo
- [ ] Auditoria funcionando
- [ ] Validação em todos os DTOs
- [ ] Backup de banco configurado
- [ ] Logs de erro configurados
- [ ] Testes de segurança realizados

### Testes de Segurança

**Cenários para testar:**

1. **Token Expirado**
   - Access token expirado → 401 Unauthorized

2. **Token Inválido**
   - Token adulterado → 401 Unauthorized

3. **Sem Token**
   - Rota protegida sem token → 401 Unauthorized

4. **Usuário Bloqueado**
   - Login com usuário bloqueado → 401 Unauthorized
   - Token de usuário bloqueado → 401 Unauthorized

5. **Refresh Token Revogado**
   - Usar refresh token após logout → 401 Unauthorized

6. **Roles/Permissions**
   - Usuário sem role necessária → 403 Forbidden
   - Usuário sem permission necessária → 403 Forbidden

7. **Validação de Dados**
   - Email inválido → 400 Bad Request
   - Senha curta → 400 Bad Request

8. **Auditoria**
   - Ações sendo logadas corretamente
   - IP e user_agent capturados

---

## 🆘 Incidentes de Segurança

### Se Refresh Token Vazar

**Ações imediatas:**
1. Revogar token no banco (logout forçado)
2. Notificar usuário
3. Investigar logs de auditoria
4. Trocar JWT_REFRESH_SECRET (invalida todos os refresh tokens)

### Se JWT_SECRET Vazar

**Ações imediatas:**
1. Gerar novo JWT_SECRET
2. Trocar em produção (invalida todos os tokens)
3. Forçar re-login de todos os usuários
4. Investigar como vazou

### Se Banco de Dados Vazar

**Mitigação:**
- ✅ Senhas hasheadas com bcrypt → seguras
- ✅ Refresh tokens hasheados SHA256 → seguros
- ⚠️ Access tokens JWT no banco? Não deveria ter
- ⚠️ Dados pessoais → comunicar usuários (LGPD)

---

## 📚 Recursos Adicionais

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **JWT Best Practices:** https://tools.ietf.org/html/rfc8725
- **Bcrypt Docs:** https://github.com/kelektiv/node.bcrypt.js
- **NestJS Security:** https://docs.nestjs.com/security/authentication

---

## 🔍 Auditorias Recomendadas

**Regularmente revise:**
- Logs de auditoria (ações suspeitas)
- Refresh tokens ativos (revogar antigos)
- Usuários bloqueados/deletados
- Roles e permissions (princípio do menor privilégio)

**Ferramentas:**
- **Snyk** - Vulnerabilidades de dependências
- **OWASP ZAP** - Testes de penetração
- **npm audit** - Vulnerabilidades npm

```bash
npm audit
npm audit fix
```

---

**Segurança é um processo contínuo, não um estado final. Mantenha-se atualizado! 🛡️**
