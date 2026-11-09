# Deploy: passo a passo

O código já está pronto (ver [deploy-cloudflare.md](deploy-cloudflare.md) para o porquê de cada escolha). Falta só ligar a conta. A ordem importa: DNS primeiro, porque Workers em rota e o Resend dependem dele.

## 1. Na Cloudflare (no navegador)

1. Crie a conta em cloudflare.com e confirme o e-mail.
2. **Add a domain** → `mybricks.com.br` → plano **Free**. A Cloudflare mostra dois *nameservers* (algo como `xxx.ns.cloudflare.com`).
3. No registrador (o do MyBricks é o **GoDaddy**: Meus produtos → o domínio → DNS → Nameservers → *Inserir meus próprios nameservers*), troque os servidores pelos dois da Cloudflare (`ada.ns.cloudflare.com` e `matteo.ns.cloudflare.com`, no caso do MyBricks) e confirme na Cloudflare com **I updated my nameservers**. Se o DNSSEC estiver ligado, desligue antes. Se o GoDaddy não permitir a troca para um `.com.br`, faça-a em registro.br. A ativação leva de minutos a algumas horas; a Cloudflare avisa por e-mail.

4. Em **DNS → Records**, confira os registros que a Cloudflare importou do domínio:
   - Os registros `A` do `mybricks.com.br` (o site antigo) **já com a nuvem laranja** bastam para a rota do Worker funcionar: ela responde antes do servidor antigo. Deixe-os até o deploy; depois podem ser apagados.
   - Se o apex **não** tiver nenhum registro proxied, crie `AAAA` `@` → `100::` (nuvem laranja). Ele não aponta para lugar nenhum de verdade: só faz o tráfego passar pela Cloudflare.
   - Crie sempre, para a homologação: `AAAA` `staging` → `100::`, com a nuvem laranja.
   - Mantenha `_dmarc` (política de e-mail). Ignore o aviso "add an MX record": só serve para *receber* e-mail no domínio.
   - O `www` fica de fora das rotas (o login só confia em `mybricks.com.br`): depois do deploy, crie em **Rules → Redirect Rules** um redirecionamento de `www.mybricks.com.br` para `https://mybricks.com.br`.

5. **Workers Paid (US$ 5/mês): só se for preciso.** Comece no plano grátis (100 mil requisições por dia bastam). O risco é o limite de 10 ms de CPU por requisição: criar conta e entrar fazem o hash da senha, e se estourar o login devolve "exceeded CPU time" (erro 1102). Teste na homologação (seção 4); se der esse erro, assine em **Workers & Pages → Upgrade** e teste de novo.
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

Abra `https://staging.mybricks.com.br` e teste: criar conta (o e-mail de confirmação tem que chegar), entrar, cadastrar um imóvel com foto, gerar um PDF de contrato, entrar como convidado. Se criar conta ou entrar der erro de CPU (1102), veja o item 5 da seção 1.

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

## 7. Proteção contra excesso de requisições (ataque, bot, abuso)

Como sites reais fazem: em **camadas**, a barata e grossa na frente (borda), a fina e específica atrás (aplicação), e alertas para você ficar sabendo.

**Já está no código (nada a fazer, vale em produção)**

| Camada | O que faz |
|---|---|
| Limite por endereço nas rotas de autenticação (`rate_limits` no banco) | entrar: 10 por minuto; criar conta: 5 por 10 min; reenviar confirmação: 3 por 5 min; convidado: 5 por hora; demais rotas de `/api/auth`: 120 por minuto. Passou do limite: HTTP 429. O endereço vem do cabeçalho `cf-connecting-ip` da Cloudflare, que não dá para falsificar |
| Teto de convidados por dia (`DEMO_DAILY_LIMIT`, padrão 100) | cada convidado grava uma carteira de exemplo; sem teto, um laço automático esgotaria a cota de escrita do D1 (100 mil linhas por dia no plano grátis). Passou do teto: 429 `DEMO_LIMIT_REACHED`, e o front explica |
| Corpo JSON limitado a 1 MB e upload limitado (`MAX_UPLOAD_MB`) | recusa o corpo gigante sem ler (413) |
| Cabeçalhos de segurança na API e no front | `nosniff`, sem iframe, HSTS, política de referência |
| Limpeza automática dos contadores | o cron horário apaga contadores com mais de 1 dia |

**No painel da Cloudflare (domínio `mybricks.com.br`), uma vez, uns 10 minutos**

1. **Security → Bots → Bot Fight Mode:** ligue.
2. **Security → Settings → Security Level:** `Medium` (o padrão). O *Under Attack Mode* é só para emergência, durante um ataque.
3. **Security → WAF → Rate limiting rules → Create rule** (o plano grátis tem 1 regra, com janela fixa de 10 s):
   - Nome: `API burst`
   - Quando: *URI Path* **wildcard** `/api/*` (expressão: `(http.request.uri.path wildcard "/api/*")`)
   - Característica: **IP**; limite: **50 requisições em 10 segundos**
   - Ação: **Block** (por 10 s)
   - Uma tela do app dispara umas 10 chamadas ao abrir, então 50 é folgado para uso normal e barra rajadas.
4. **Security → WAF → Managed rules:** confira que o *Cloudflare Managed Free Ruleset* está ligado.
5. **SSL/TLS → Edge Certificates:** *Always Use HTTPS* ligado e *Minimum TLS Version* 1.2.
6. **Notifications → Add:** alertas de **DDoS** e de **uso/cobrança** (Billing: Usage-based). Assim você recebe e-mail antes de uma fatura surpresa.
7. **Proteja as contas** que controlam o sistema: verificação em duas etapas na Cloudflare, no GoDaddy, no GitHub e no Resend. Tokens de API só com as permissões necessárias.

O que acontece num ataque de verdade: o tráfego barrado pelo WAF **nem chega ao Worker** (não conta no limite de 100 mil requisições por dia). Se mesmo assim passar do limite do plano grátis, o site fica indisponível até o dia seguinte, mas **não gera cobrança**. No plano pago, a requisição extra é cobrada por uso (centavos por milhão), e os alertas do item 6 avisam.

**Próximo reforço, quando houver tráfego real:** Cloudflare Turnstile (CAPTCHA gratuito e quase invisível) nos formulários de criar conta, entrar e convidado. O Better Auth tem plugin pronto para isso; falta só o componente no front.

## 8. Depois do primeiro deploy

- Crie a branch `development` (`git switch -c development && git push -u origin development`) e passe a trabalhar nela, com merge na `main` para publicar.
- Convites de organização e recuperação de senha ainda não mandam e-mail (o Resend já está ligado; falta só chamar).
- Limite de tentativas de login: o do Better Auth guarda a contagem em memória, que no Worker é por instância. Se virar problema, mover para o banco.
