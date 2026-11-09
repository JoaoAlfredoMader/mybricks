# Primeiro deploy na Cloudflare: pré-requisitos

Estado em 2026-11-09. Domínio: `mybricks.com.br`. E-mail: Resend. Monorepo: `app/` (front) e `api/` (back).

**Os comandos, na ordem, estão em [deploy-passo-a-passo.md](deploy-passo-a-passo.md).** Este documento explica as escolhas.

## 1. Arquitetura proposta

Um único domínio, dois Workers, mesma origem (sem CORS, cookie de sessão funciona como em desenvolvimento, onde o Vite faz proxy de `/api`):

| Peça | Onde roda | Rota |
|---|---|---|
| Front (`app/dist`) | Worker com *static assets* (SPA fallback) | `mybricks.com.br/*` |
| API (`api/`) | Worker (Hono) | `mybricks.com.br/api/*` (a rota mais específica ganha) |
| Fotos, documentos, PDFs | R2 (bucket `mybricks-files`) | binding `FILES` |
| E-mail | Resend (API HTTP) | domínio `mybricks.com.br` verificado |
| Banco | D1 (SQLite), binding `DB` | |
| Manutenção (demos expirados, órfãos) | Cron Trigger do Worker | substitui o `setInterval` do `server.ts` |

## 2. Banco: D1 (decidido em 2026-11-09)

A API foi migrada de Prisma + PostgreSQL para **Drizzle + SQLite**, que é o banco do D1. Em desenvolvimento e nos testes roda num arquivo SQLite (libSQL); no Worker, no binding `DB` do D1. O mesmo schema e as mesmas migrations (`api/migrations/*.sql`) valem para os dois.

O que mudou por causa do D1 (detalhes em `api/README.md`):

- **Sem transações interativas.** O D1 só aceita *batches* atômicos. Escritas em várias etapas viraram `atomic(db, [...])`, com ids gerados pela aplicação.
- **Regras no banco:** `EXCLUDE` de reservas sobrepostas virou *trigger*; índice único parcial, `CHECK`s e chaves compostas continuam.
- **Limite de 100 parâmetros por comando** no D1: listas e inserts em lote são divididos.
- **Busca:** `LIKE` do SQLite só ignora maiúsculas ASCII; a busca de cidades usa a coluna `name_search` (sem acentos).
- **Arquivos:** o Worker usa o bucket R2 pelo binding `FILES` (sem chaves S3). Em Node continuam os drivers `local` e `s3`.

## 3. O que já está pronto no código

Já existe e foi testado no runtime real da Cloudflare, localmente (`npm run dev:worker -w api`, com D1 e R2 simulados):

- `api/src/worker.ts` (fetch e cron), `api/wrangler.jsonc` com D1, R2 e cron horário; `compatibility_date` fixa e `nodejs_compat`.
- Cadastro, convidado com carteira de exemplo, listagens, KPIs, busca de cidades, geração e download de PDF de contrato.
- Pacote do Worker: cerca de 4,7 MB (0,9 MB comprimido), dentro do limite de 3 MB do plano gratuito. O limite de CPU de 10 ms do plano gratuito continua sendo um risco para o hash de senha: provavelmente será preciso o **Workers Paid (US$ 5/mês)**.

Também pronto: o Worker do front (`app/wrangler.jsonc`: arquivos estáticos com fallback para SPA, testado localmente), as rotas no domínio (`/api/*` para a API, o resto para o front), o ambiente de homologação (`--env staging`, em `staging.mybricks.com.br`, com banco e bucket próprios) e os workflows do GitHub (`.github/workflows`: CI e deploy).

Falta ligar na conta: criar D1 e R2, colocar os ids nos `wrangler.jsonc`, segredos e DNS (seção 4 e o passo a passo).

## 4. Passos manuais (conta e DNS)

**Cloudflare**
1. Conta Cloudflare; plano Workers Paid.
2. Adicionar a zona `mybricks.com.br` e trocar os *nameservers* no registrador (GoDaddy) para os da Cloudflare. **Isso é pré-requisito do Resend também**, porque os registros DNS dele vão para lá.
3. Criar o bucket R2: `npx wrangler r2 bucket create mybricks-files` (sem chaves S3: o Worker usa o binding).
4. Token de API da Cloudflare para o CI (`Workers Scripts: Edit`, `Workers Routes: Edit`, `Account Settings: Read`).
5. Criar o banco: `npx wrangler d1 create mybricks`, colocar o `database_id` em `api/wrangler.jsonc` e aplicar as migrations: `npm run db:deploy -w api`.

**Resend**
1. Conta Resend; *Domains → Add Domain* `mybricks.com.br` (região `sa-east-1`, São Paulo, se disponível).
2. Cadastrar na Cloudflare os registros que o Resend mostrar: MX e TXT SPF em `send`, TXT DKIM em `resend._domainkey`. O Resend tem o botão de conexão automática com a Cloudflare. Depois, *Verify DNS Records* (pode levar de minutos a 72 h). Se já existir SPF no domínio, mesclar, nunca duplicar.
3. Recomendado: registro DMARC (`_dmarc`, `v=DMARC1; p=none; rua=mailto:...`).
4. Criar uma API key com permissão **só de envio** e restrita ao domínio.
5. Remetente: `MyBricks <nao-responder@mybricks.com.br>` (já é o padrão de `EMAIL_FROM`).

**Segredos e variáveis do Worker da API** (`wrangler secret put`)
`BETTER_AUTH_SECRET` (gerar novo, `openssl rand -base64 48`) e `RESEND_API_KEY`. As variáveis públicas (`NODE_ENV`, `EMAIL_DRIVER`, `EMAIL_FROM`, `BETTER_AUTH_URL`, `FRONTEND_URL`) já estão em `api/wrangler.jsonc`; `LISTINGS_WHATSAPP_NUMBER` tem padrão.

**Dados iniciais**
As referências (cidades, subtipos, categorias) já vêm nas migrations. O primeiro admin da plataforma: criar a conta pelo próprio site (confirmando o e-mail) e promovê-la com `npx wrangler d1 execute DB --remote --command "UPDATE users SET role = 'admin' WHERE email = 'voce@exemplo.com'"`. O script `admin:create` só fala com o arquivo SQLite local, não com o D1.

## 5. Repositório e fluxo de branches

1. O monorepo vive no repositório `mybricks` (renomeado de `my-bricks-front-end` em 2026-11-09; os links antigos redirecionam). Arquivar `my-bricks-back-end`. O back tinha 6 commits locais que nunca foram enviados; eles já estão dentro do monorepo.
2. `story.tsx` da landing aponta para os dois repositórios antigos: atualizar para o novo.
3. Depois do primeiro deploy: `main` = produção; `development` = trabalho do dia a dia, com ambiente de homologação próprio (outro Worker/`env` do wrangler e **outro banco**, nunca o de produção) e merge em `main` para publicar.
4. CI (GitHub Actions ou Workers Builds): em `development` roda typecheck, lint e testes; em `main` roda os mesmos, aplica as migrations e faz o deploy.

## 6. Ordem sugerida

1. (feito) Banco D1 e adaptação da API para Worker, testada localmente.
2. Conta Cloudflare, zona e nameservers; conta e domínio no Resend (os dois dependem de DNS propagado).
3. Criar D1 e R2, preencher o `wrangler.jsonc`, aplicar as migrations e fazer o primeiro `wrangler deploy` da API.
4. Deploy de homologação no domínio `workers.dev`; testar cadastro com e-mail real, login, upload e PDF.
5. Produção em `mybricks.com.br`.
