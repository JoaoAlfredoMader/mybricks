# Primeiro deploy na Cloudflare: pré-requisitos

Estado em 2026-11-09. Domínio: `mybricks.com.br`. E-mail: Resend. Monorepo: `app/` (front) e `api/` (back).

## 1. Arquitetura proposta

Um único domínio, dois Workers, mesma origem (sem CORS, cookie de sessão funciona como em desenvolvimento, onde o Vite faz proxy de `/api`):

| Peça | Onde roda | Rota |
|---|---|---|
| Front (`app/dist`) | Worker com *static assets* (SPA fallback) | `mybricks.com.br/*` |
| API (`api/`) | Worker (Hono) | `mybricks.com.br/api/*` (a rota mais específica ganha) |
| Fotos, documentos, PDFs | R2 (bucket) | via driver `s3` que a API já tem (endpoint do R2) |
| E-mail | Resend (API HTTP) | domínio `mybricks.com.br` verificado |
| Banco | **decisão pendente** (seção 2) | |
| Manutenção (demos expirados, órfãos) | Cron Trigger do Worker | substitui o `setInterval` do `server.ts` |

## 2. Decisão pendente: o banco

"Tudo na Cloudflare" colide com o schema atual. A Cloudflare não hospeda PostgreSQL; o banco dela é o **D1 (SQLite)**. O schema usa recursos que o SQLite não tem:

- `EXCLUDE` com `btree_gist` (impede reservas sobrepostas no banco), índices únicos parciais, `CHECK`s, `unaccent`, `gen_random_uuid()` (migrations `manual_constraints`, `enable_unaccent`, `property_listings`).
- FKs compostas `(id, organization_id)` para o isolamento entre organizações, `Decimal`, `@db.Date`, enums.

| | A. Postgres externo + Hyperdrive | B. D1 (SQLite) |
|---|---|---|
| Esforço | baixo: trocar o adaptador de conexão e criar o banco | alto: reescrever schema e migrations, trocar a regra de reservas sobrepostas por lógica na aplicação/trigger, abrir mão de `unaccent` (busca sem acento), refazer a suíte de testes |
| Fica 100% na Cloudflare | não (Postgres em Neon, Supabase ou Prisma Postgres; a Cloudflare só acelera a conexão com o Hyperdrive) | sim |
| Risco para regras de negócio | nenhum | médio (o banco deixa de garantir o que garante hoje) |
| Branch `development` com banco próprio | fácil (Neon tem *branches* de banco) | fácil (outro D1) |

Recomendação: **A** para o primeiro deploy; D1 só se "tudo na Cloudflare" for requisito duro.

## 3. O que a API precisa para rodar em Worker (código, depois da decisão)

1. Entrada `src/worker.ts` exportando `fetch` e `scheduled`; hoje existe só `server.ts` (Node).
2. Configuração vinda dos *bindings* (`env` do Worker), não de `process.env`: adaptar `loadEnv`.
3. Cliente Prisma criado **por requisição** (gerador com `runtime = "cloudflare"`, `@prisma/adapter-pg` + Hyperdrive, `nodejs_compat` ligado, `compatibility_date` fixa).
4. Better Auth: `advanced.backgroundTasks.handler` apontando para `ctx.waitUntil`, senão o envio do e-mail (que não é aguardado de propósito) pode ser cortado.
5. **PDF de contrato (`pdfkit`)**: lê fontes do disco; no Worker precisa do build *standalone* com as fontes embutidas. É o ponto de maior risco: tem que ter teste antes do deploy.
6. Tamanho do bundle (Prisma + pdfkit + AWS SDK + Better Auth): o plano gratuito limita o script a 3 MB comprimido, e o limite de CPU de 10 ms por requisição é curto para o hash de senha. Na prática, **Workers Paid (US$ 5/mês)**.
7. Manutenção: `triggers.crons` chamando `runMaintenance` (o `setInterval` não existe em Worker).
8. Migrations não rodam no Worker: `prisma migrate deploy` a partir do CI ou da máquina, apontando para o banco de produção, antes de cada deploy.

## 4. Passos manuais (conta e DNS)

**Cloudflare**
1. Conta Cloudflare; plano Workers Paid.
2. Adicionar a zona `mybricks.com.br` e trocar os *nameservers* no registrador (Registro.br) para os da Cloudflare. **Isso é pré-requisito do Resend também**, porque os registros DNS dele vão para lá.
3. Criar o bucket R2 (`mybricks-files`) e um token de API do R2 (chave de acesso S3).
4. Token de API da Cloudflare para o CI (`Workers Scripts: Edit`, `Workers Routes: Edit`, `Account Settings: Read`).
5. Criar o banco escolhido (seção 2) e, se Postgres, o Hyperdrive apontando para ele.

**Resend**
1. Conta Resend; *Domains → Add Domain* `mybricks.com.br` (região `sa-east-1`, São Paulo, se disponível).
2. Cadastrar na Cloudflare os registros que o Resend mostrar: MX e TXT SPF em `send`, TXT DKIM em `resend._domainkey`. O Resend tem o botão de conexão automática com a Cloudflare. Depois, *Verify DNS Records* (pode levar de minutos a 72 h). Se já existir SPF no domínio, mesclar, nunca duplicar.
3. Recomendado: registro DMARC (`_dmarc`, `v=DMARC1; p=none; rua=mailto:...`).
4. Criar uma API key com permissão **só de envio** e restrita ao domínio.
5. Remetente: `MyBricks <nao-responder@mybricks.com.br>` (já é o padrão de `EMAIL_FROM`).

**Segredos e variáveis do Worker da API** (`wrangler secret put`)
`BETTER_AUTH_SECRET` (gerar novo, `openssl rand -base64 48`), `RESEND_API_KEY`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, credencial do banco. Variáveis comuns: `NODE_ENV=production`, `EMAIL_DRIVER=resend`, `BETTER_AUTH_URL=https://mybricks.com.br`, `FRONTEND_URL=https://mybricks.com.br`, `STORAGE_DRIVER=s3`, `S3_ENDPOINT=https://<conta>.r2.cloudflarestorage.com`, `S3_BUCKET`, `S3_REGION=auto`, `LISTINGS_WHATSAPP_NUMBER`.

**Dados iniciais**
Rodar `db:seed` contra produção (referências e cidades) e `admin:create` para o primeiro admin da plataforma.

## 5. Repositório e fluxo de branches

1. O monorepo vive no repositório `mybricks` (renomeado de `my-bricks-front-end` em 2026-11-09; os links antigos redirecionam). Arquivar `my-bricks-back-end`. O back tinha 6 commits locais que nunca foram enviados; eles já estão dentro do monorepo.
2. `story.tsx` da landing aponta para os dois repositórios antigos: atualizar para o novo.
3. Depois do primeiro deploy: `main` = produção; `development` = trabalho do dia a dia, com ambiente de homologação próprio (outro Worker/`env` do wrangler e **outro banco**, nunca o de produção) e merge em `main` para publicar.
4. CI (GitHub Actions ou Workers Builds): em `development` roda typecheck, lint e testes; em `main` roda os mesmos, aplica as migrations e faz o deploy.

## 6. Ordem sugerida

1. Decidir o banco (seção 2).
2. Conta Cloudflare, zona e nameservers; conta e domínio no Resend (os dois dependem de DNS propagado).
3. Adaptar a API para Worker (seção 3), com teste do PDF.
4. Deploy de homologação no domínio `workers.dev`; testar cadastro com e-mail real, login, upload e PDF.
5. Produção em `mybricks.com.br`.
