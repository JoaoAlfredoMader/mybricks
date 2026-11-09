# Prompt — back-end (`my-bricks-back-end`): imóveis à venda como anúncios

> Cole isto numa sessão aberta em `C:\Users\Plansul\my-bricks-back-end`. Faça o back **antes** do front: o front gera os tipos a partir de `docs/openapi.json`.

## Objetivo

O dono de um imóvel pode marcá-lo como **à venda**. Ao marcar, ele consente que o imóvel apareça como **anúncio** na plataforma. Os anúncios aparecem num carrossel (Painel dos usuários logados e landing pública), e cada card leva a uma conversa de WhatsApp com a **MyBricks** (o número é da plataforma, não do dono) com uma mensagem pronta sobre o imóvel.

Isso quebra de propósito o isolamento por carteira: o anúncio é o único dado que sai de uma organização para o público. Por isso a regra central é **expor só o que está numa lista de campos permitidos**.

## Decisões já tomadas (não reabrir)

- Carrossel no Painel (`/app`) e na landing → o endpoint de leitura é **público** (sem sessão).
- Preço de venda **obrigatório** para marcar à venda. Nunca usar `estimatedValueCents` (é interno).
- Anúncio entra **direto**, depois do consentimento do dono. O admin da plataforma pode **ocultar**. Organizações demo (`isDemo`) **nunca** aparecem.
- Para o anúncio ir ao ar, o imóvel precisa de: **pelo menos 1 foto**, **cidade e bairro**, **área**. Enquanto faltar algo, ele fica **pendente** (o dono pode marcar à venda na criação, antes de subir fotos).
- WhatsApp da plataforma: `48991802046` (formato `wa.me`: `5548991802046`).

## Contrato (idêntico no prompt do front — não mude sem avisar)

### Campos novos em `Property` (create/update e resposta)

Pedido (create/update), no estilo dos sub-objetos já existentes (`manualRental`, `financing`: `null` quando não se aplica):

```
forSale: { priceCents: number /* inteiro > 0 */, consent: true } | null
```

Resposta (detalhe **e** itens da lista de imóveis):

```
forSale: {
  priceCents: number,
  consentedAt: string /* ISO */,
  status: "pending" | "live" | "hidden",
  missing: ("photo" | "address" | "area")[]   // vazio quando não falta nada
} | null
```

Regras:
- Ligar (`forSale` não nulo num imóvel que não estava à venda) exige `consent: true`; sem isso, 422. Guarde `listingConsentedAt = now()`.
- Editar o preço de um imóvel já à venda **não** renova o consentimento nem a data.
- `forSale: null` desliga: zera preço e consentimento. **Não** zere `listingHiddenAt` (senão o dono burlaria a moderação religando).
- `status`: `hidden` se `listingHiddenAt` não é nulo (tem precedência); senão `pending` se `missing` não é vazio; senão `live`.
- `missing`: `photo` = nenhuma foto; `address` = sem endereço ou sem `neighborhood` preenchido (cidade vem junto do endereço); `area` = nem `privateArea` nem `totalArea`.
- Permissões de escrita iguais às de qualquer edição de imóvel (membro só mexe no que é dele; owner/admin em tudo).

### Endpoints públicos (sem sessão)

`GET /api/listings?limit=12` (padrão 12, máximo 24, ordem: `listingConsentedAt` desc)

```
200 {
  whatsappNumber: "5548991802046",
  items: [{
    id: string /* id do imóvel */,
    reference: string /* id.slice(0,8) em maiúsculas */,
    propertyType, subtypeName: string | null,
    salePriceCents: number,
    area: { value: number, unit: "m2" | "ha" },   // privateArea ?? totalArea; "ha" só em rural
    bedrooms, suites, bathrooms, parkingSpaces: number | null,
    builtYear: number | null, conservationState: string | null,
    city: string, state: string, neighborhood: string,
    photoCount: number,
    coverPhotoUrl: string /* "/api/listings/{id}/cover" */,
    listedAt: string
  }]
}
```

`GET /api/listings/{id}/cover` → bytes da primeira foto (por `position`), só de anúncio `live`; 404 caso contrário.
Cabeçalhos: JSON `cache-control: public, max-age=60`; imagem `public, max-age=3600` + `nosniff` + mesmo `content-disposition: inline` do endpoint de fotos.

**Nunca** expor: `name`, `notes`, rua, número, complemento, CEP, coordenadas, cliente/proprietário, agência, organização, valor estimado, despesas, percentual de participação, financiamento, aluguel, documentos, ids de organização/usuário.

### Moderação

`PATCH /api/admin/listings/{propertyId}` com `{ hidden: boolean }`, só admin da plataforma (mesmo padrão de `createAdminFeedbackRoutes`). Preenche/zera `listingHiddenAt`. 404 se o imóvel não está à venda. Registre em auditoria.

### Configuração

`LISTINGS_WHATSAPP_NUMBER` em `src/config/env.ts` (só dígitos, 12–13), padrão `5548991802046`, documentado em `.env.example`.

## O que implementar

1. **Prisma**: em `Property`, `listingPriceCents BigInt?`, `listingConsentedAt DateTime?`, `listingHiddenAt DateTime?` (com `@map`), índice parcial/composto para a consulta pública. Nova migration (siga o padrão das existentes; use a data de hoje, 2026-11-05) e, no estilo de `manual_constraints`, um CHECK: preço > 0 e consentimento preenchido quando há preço (`listing_price_cents IS NULL OR (listing_price_cents > 0 AND listing_consented_at IS NOT NULL)`). Atualize `docs/database/mybricks-database.dbml`.
2. **Módulo `src/modules/listings/`** (route → controller → service → repository, como os outros): leitura pública, capa, moderação. A consulta pública **não** usa `tenantScope`; escreva o `where` explícito (preço não nulo, não oculto, `organization.isDemo = false`, ≥1 foto, `address.neighborhood` não vazio, área não nula). A regra de "live" existe em dois lugares (SQL e derivação do `status`): centralize o que for possível e **teste que os dois concordam**.
3. **Módulo `properties`**: aceitar `forSale` no create/update (schemas Zod), devolver `forSale` no DTO de detalhe e de lista, com `status`/`missing` derivados (arquivo próprio, como `property-status.ts`, com testes unitários).
4. **Fotos**: nada muda no endpoint autenticado. Apagar a última foto de um anúncio `live` é permitido (o anúncio só volta para `pending`).
5. **OpenAPI**: registre as operações novas em `src/openapi/routes.ts` (`getListings`/`listListings`, `getListingCover`, `setListingHidden`; as públicas com `access: "public"`), schemas em `src/openapi/schemas/`, rode `npm run openapi:export` e commite `docs/openapi.json`. O teste de OpenAPI chama cada operação de verdade e falha se o corpo tiver campo fora do schema.
6. **Auditoria**: ligar/desligar à venda e ocultar/reexibir entram no audit log (ver `audit.recorder.ts`).
7. **README**: uma seção curta sobre anúncios (o que é público, o que nunca sai, a variável de ambiente).

## Testes (Vitest, como em `tests/api/*`)

- Sem cookie: `GET /api/listings` devolve 200 e só anúncios `live`.
- Não aparecem: organização demo, `hidden`, sem foto, sem bairro, sem área, não à venda.
- Vazamento: um teste de "lista branca" confere que a resposta não tem `name`, `notes`, `street`, `estimatedValueCents`, `organizationId` etc.
- `forSale` sem `consent` → 422; preço 0 ou ausente → 422; religar não renova `consentedAt`; desligar zera preço/consentimento mas mantém `hiddenAt`.
- Membro de outra organização não edita o `forSale` alheio (404, como o resto).
- Ocultar: só admin da plataforma; imóvel não à venda → 404.
- Capa: 200 para `live`, 404 para `pending`/`hidden`/inexistente; cabeçalhos públicos.
- Unidade de área: rural devolve `ha`, o resto `m2`.

## Regras do projeto

- Código e commits em inglês; mensagens de erro da API em inglês (o front traduz).
- Commits Conventional Commits, **pequenos**, direto na `main`, **sem `git push`**, **sem linhas de atribuição** (nada de `Co-Authored-By`).
- Rode `npm run typecheck` e `npm test` antes de encerrar e diga o que passou. Se algo do contrato acima não couber no código existente, pare e me diga em vez de inventar outro formato.
