# Deploy: passo a passo

O código já está pronto (ver [deploy-cloudflare.md](deploy-cloudflare.md) para o porquê de cada escolha). Falta só ligar a conta. A ordem importa: DNS primeiro, porque Workers em rota e o Resend dependem dele.

## 1. Na Cloudflare (no navegador)

1. Crie a conta em cloudflare.com e confirme o e-mail.
2. **Add a domain** → `mybricks.com.br` → plano **Free**. A Cloudflare mostra dois *nameservers* (algo como `xxx.ns.cloudflare.com`).
3. No **Registro.br** (Painel → o domínio → DNS → *Alterar servidores DNS*), troque os servidores pelos dois da Cloudflare. A ativação leva de minutos a algumas horas; a Cloudflare avisa por e-mail.
4. Em **DNS → Records**, confira os registros que a Cloudflare importou do domínio:
   - Os registros `A` do `mybricks.com.br` (o site antigo) **já com a nuvem laranja** bastam para a rota do Worker funcionar: ela responde antes do servidor antigo. Deixe-os até o deploy; depois podem ser apagados.
   - Se o apex **não** tiver nenhum registro proxied, crie `AAAA` `@` → `100::` (nuvem laranja). Ele não aponta para lugar nenhum de verdade: só faz o tráfego passar pela Cloudflare.
   - Crie sempre, para a homologação: `AAAA` `staging` → `100::`, com a nuvem laranja.
   - Mantenha `_dmarc` (política de e-mail). Ignore o aviso "add an MX record": só serve para *receber* e-mail no domínio.
   - O `www` fica de fora das rotas (o login só confia em `mybricks.com.br`): depois do deploy, crie em **Rules → Redirect Rules** um redirecionamento de `www.mybricks.com.br` para `https://mybricks.com.br`.

5. **Workers & Pages → Plans** → assine o **Workers Paid** (US$ 5/mês). Sem ele, o limite de 10 ms de CPU por requisição provavelmente derruba o login (hash de senha).
6. **R2** → ative (pede um cartão; o uso do MyBricks fica na faixa gratuita).

## 2. No terminal (na pasta `api`)

```bash
npx wrangler login
```

Crie os bancos e os buckets (produção e homologação):

```bash
npx wrangler d1 create mybricks
npx wrangler d1 create mybricks-staging
npx wrangler r2 bucket create mybricks-files
npx wrangler r2 bucket create mybricks-files-staging
```

Cada `d1 create` imprime um `database_id`. Cole-os em `api/wrangler.jsonc`: o de `mybricks` em `d1_databases` e o de `mybricks-staging` em `env.staging.d1_databases`.

Aplique as migrations (criam as tabelas e carregam cidades, subtipos e categorias):

```bash
npm run db:deploy:staging
npm run db:deploy
```

Segredos (cada comando pede o valor; para o `BETTER_AUTH_SECRET` gere um novo com `openssl rand -base64 48`, um diferente por ambiente):

```bash
npx wrangler secret put BETTER_AUTH_SECRET --env staging
npx wrangler secret put RESEND_API_KEY --env staging
npx wrangler secret put BETTER_AUTH_SECRET --env=""
npx wrangler secret put RESEND_API_KEY --env=""
```

> O `secret put` cria o Worker se ele ainda não existir. Se perguntar, confirme.

## 3. Resend (e-mail)

1. Em resend.com, **Domains → Add Domain** → `mybricks.com.br` (região São Paulo, se houver).
2. Use o botão de conexão automática com a Cloudflare (ou copie os registros MX, SPF e DKIM para **DNS → Records**; se já existir um SPF, mescle, não duplique). Clique em **Verify** e espere ficar verde.
3. **API Keys** → crie uma chave só com permissão de envio, restrita ao domínio. É o valor do `RESEND_API_KEY` acima.

## 4. Primeiro deploy: homologação, depois produção

Na raiz do repositório:

```bash
npm run build -w app
npm run deploy:staging -w api
npm run deploy:staging -w app
```

Abra `https://staging.mybricks.com.br` e teste: criar conta (o e-mail de confirmação tem que chegar), entrar, cadastrar um imóvel com foto, gerar um PDF de contrato, entrar como convidado. Se o login estiver lento ou der erro de CPU, veja o item 5 da seção 1.

Funcionou? Produção:

```bash
npm run deploy -w api
npm run deploy -w app
```

`https://mybricks.com.br` deve abrir a landing, e `/api/docs` a documentação da API.

## 5. Primeiro administrador da plataforma

Crie a conta pelo site (confirmando o e-mail) e promova-a:

```bash
cd api
npx wrangler d1 execute DB --remote --env="" --command "UPDATE users SET role = 'admin' WHERE email = 'voce@exemplo.com'"
```

(Para a homologação, troque `--env=""` por `--env staging`.)

## 6. Deploy automático pelo GitHub (opcional)

Os workflows já estão em `.github/workflows/`. O CI roda em todo push e PR. O deploy só liga quando você quiser:

1. No GitHub, **Settings → Environments**: crie `production` e `staging`.
2. Em cada um, adicione os secrets `CLOUDFLARE_ACCOUNT_ID` (Cloudflare → Workers & Pages → coluna da direita) e `CLOUDFLARE_API_TOKEN` (My Profile → API Tokens → modelo **Edit Cloudflare Workers**, e acrescente a permissão **Account → D1 → Edit**).
3. **Settings → Secrets and variables → Actions → Variables**: crie `DEPLOY_ENABLED` = `true`.

Daí em diante: push na `main` publica em produção; push na `development` publica na homologação. As migrations do D1 rodam antes do código novo.

## 7. Depois do primeiro deploy

- Crie a branch `development` (`git switch -c development && git push -u origin development`) e passe a trabalhar nela, com merge na `main` para publicar.
- Convites de organização e recuperação de senha ainda não mandam e-mail (o Resend já está ligado; falta só chamar).
- Limite de tentativas de login: o do Better Auth guarda a contagem em memória, que no Worker é por instância. Se virar problema, mover para o banco.
