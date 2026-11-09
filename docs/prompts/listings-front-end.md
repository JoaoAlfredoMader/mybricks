# Prompt — front-end (`my-bricks-front-end`): imóveis à venda como anúncios

> Cole isto numa sessão aberta em `C:\Users\Plansul\my-bricks-front-end`, **depois** de o back-end estar pronto e com `docs/openapi.json` exportado. Primeiro rode `npm run api:types`.

## Objetivo

O dono marca um imóvel como **à venda** no formulário. Ao ligar, aparece um popup avisando que o imóvel vai aparecer como anúncio na plataforma. Os anúncios aparecem num **carrossel** no Painel (`/app`) e na landing, cada card com foto, metragem, bairro-cidade e mais; um ícone de **WhatsApp** abre uma conversa com a MyBricks com mensagem pronta sobre aquele imóvel.

## Decisões já tomadas (não reabrir)

- Carrossel no Painel e na landing. Visitantes e usuários veem anúncios de **todas** as carteiras.
- Preço de venda obrigatório ao marcar à venda.
- Só vai ao ar com foto, cidade+bairro e área; enquanto falta, fica **pendente** e o dono vê o que falta.
- O WhatsApp é o da plataforma (vem do back, `whatsappNumber`), não do dono.
- Se não houver nenhum anúncio, a seção **some** (sem estado vazio, sem "em breve").

## Contrato do back (idêntico ao prompt do back — se o `schema.d.ts` divergir, o schema vence; me avise)

`Property` (detalhe e itens da lista) ganha:

```
forSale: { priceCents, consentedAt, status: "pending" | "live" | "hidden", missing: ("photo"|"address"|"area")[] } | null
```

Create/update aceitam `forSale: { priceCents: number, consent: true } | null`.

`GET /api/listings?limit=12` (público):

```
{ whatsappNumber: "5548991802046",
  items: [{ id, reference, propertyType, subtypeName, salePriceCents,
            area: { value, unit: "m2" | "ha" }, bedrooms, suites, bathrooms, parkingSpaces,
            builtYear, conservationState, city, state, neighborhood,
            photoCount, coverPhotoUrl /* "/api/listings/{id}/cover" */, listedAt }] }
```

O anúncio **não** traz o nome do imóvel (é interno). O título do card é montado aqui: `subtypeName ?? rótulo do propertyType` + " no " + bairro, ex.: "Apartamento no Centro".

## O que implementar

### 1. Formulário do imóvel (`features/properties`)
- Seção nova **"Venda"** em `property-form.tsx` (depois de "Valores"): `SwitchField` "À venda" + campo de preço (mesma máscara/parse de dinheiro dos outros campos). O preço só aparece com o switch ligado.
- Ao **ligar** o switch (e só se o imóvel ainda não estava à venda), abre um diálogo (`components/confirm-dialog.tsx`/`alert-dialog`) com o texto: "Este imóvel aparecerá em formato de anúncio nesta plataforma." + o que fica público (foto, metragem, bairro e cidade, preço) e o que nunca aparece (nome interno, rua, número, proprietário). Botões "Cancelar" (switch volta a desligado) e "Anunciar". Só depois de confirmar o switch liga.
- Em `lib/property-form.ts`: estender `EMPTY_PROPERTY_FORM`, `propertyFormSchema` (preço obrigatório e > 0 quando à venda, mensagem em pt-BR), `toPropertyRequest` (`forSale: { priceCents, consent: true }` ou `null`) e `fromProperty` (imóvel já à venda volta com o switch ligado e **sem** pedir consentimento de novo). Atualize `makePropertyRecord` em `@/test/fake-api` e os testes de `property-form.test.ts`.
- Dicas de pendência: com o switch ligado, mostre o que falta para ir ao ar (foto, bairro/cidade, área), usando o que o formulário já sabe (endereço, áreas); as fotos só existem depois de criar, então no cadastro diga "adicione ao menos uma foto depois de salvar".

### 2. Lista e detalhe do imóvel
- Etiqueta **"À venda"** na lista de imóveis e no detalhe (reaproveite o estilo de `status-badge.tsx`; escolha uma cor pastel que já exista nos tokens).
- No detalhe, um cartão **"Anúncio"**: status (Pendente / No ar / Oculto pelo administrador), o preço, e se pendente, a lista do que falta com link para a ação (galeria de fotos, edição). Para `hidden`, diga que a plataforma ocultou o anúncio, sem prometer prazo.

### 3. Carrossel (`features/listings`)
- `api/queries.ts` com `listingsQueryOptions` (endpoint público; `staleTime` de ~1 min), `lib/whatsapp.ts` (monta o link) e `lib/listing-title.ts`/formatadores, todos com testes.
- **Link do WhatsApp**: `https://wa.me/<whatsappNumber>?text=<encodeURIComponent(mensagem)>`. Mensagem: `Olá! Tenho interesse no imóvel "<título>" em <bairro>, <cidade>/<UF> (ref. <reference>), anunciado na MyBricks.`
- `ListingCard`: foto de capa (`<img>` com `alt` descritivo, `loading="lazy"`, `width/height` para não pular layout; a URL é a base da API + `coverPhotoUrl`), título, "Bairro · Cidade/UF", **preço** em destaque, e o que mais valer destacar: área (m² ou ha), quartos, suítes, banheiros, vagas, preço por m² (quando `m2`), ano e conservação. Omita o que for nulo. Botão/ícone de **WhatsApp** (`<a target="_blank" rel="noopener noreferrer">` com `aria-label` "Falar no WhatsApp sobre <título>"); o glifo do WhatsApp fica num SVG próprio em `components/icons/` (o lucide não tem marca).
- `ListingsCarousel`: rolagem horizontal com `scroll-snap`, botões anterior/próximo, navegável por teclado, `aria-roledescription="carousel"`, **sem autoplay**. Sem dependência nova.
- Integração: no **Painel** (`dashboard-page.tsx`, numa seção própria, no tom pastel/`rounded-2xl` do app) e na **landing** (depois da `Story`, no visual da landing e respeitando o `data-scene` dia/noite; leia `landing.css` e `story.tsx` antes). Carregando: esqueleto discreto; erro ou lista vazia: não renderizar nada.
- O app **não tem tema escuro**; o verde do WhatsApp é a única cor de marca fora dos tokens.

## Regras do projeto

- Texto de UI em pt-BR; código, nomes e commits em inglês.
- Nada de `<select>` nativo (use `components/ui/select.tsx` ou `form/option-select.tsx`).
- O front não calcula regra de negócio que o back já devolve (`status`, `missing`).
- Skills de design: no app, os tokens TypeUI "Executive" de `src/index.css`; na landing, a skill `frontend-design`. Veja uma tela vizinha antes de desenhar.
- Testes (Vitest + Testing Library, helpers de `@/test`): cobrir o formulário (diálogo de consentimento, cancelar, preço obrigatório), o link do WhatsApp, o card (campos nulos omitidos) e o carrossel (sem itens não renderiza). Mantenha a cobertura acima do piso.
- Verifique no navegador: formulário → diálogo → salvar; Painel; landing; celular (375px).
- Commits Conventional Commits, **pequenos**, direto na `main`, **sem `git push`**, **sem linhas de atribuição** (nada de `Co-Authored-By`).
- Rode `npm run typecheck`, `npm run lint` e `npm test` antes de encerrar e diga o que passou.
