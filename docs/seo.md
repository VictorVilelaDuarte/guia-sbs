# SEO — Plano de Design e Implementação

> **Status:** **Fases 1 e 2 implementadas (2026-06-11)** — fundação técnica + JSON-LD.
> Pendências operacionais: definir `NEXT_PUBLIC_SITE_URL` na Vercel quando o domínio de
> produção for decidido, e submeter o sitemap no Google Search Console. Fases 3 e 4 a fazer.
> **Última atualização:** 2026-06-11
> Documento vivo — atualizar ao fim de cada fase com o que foi efetivamente construído.

O objetivo é fazer do Guia SBS **o resultado dominante no Google para tudo relacionado a
São Bento do Sapucaí** — tanto queries com nome ("restaurante em São Bento do Sapucaí",
"Pedra do Baú") quanto queries genéricas de descoberta ("onde ir bate-volta de SP?",
"pousada nas montanhas?"). SEO é o canal de aquisição mais importante de um guia local:
o visitante chega pelo Google **antes de decidir ir à cidade**, e cada comércio bem
indexado é um argumento de venda para o plano pago ("apareça no Google através do guia").

Este é um dos motivos da escolha de Next.js: todo o conteúdo público é renderizado no
servidor (Server Components), então o Google indexa HTML completo sem depender de JS.

---

## Estado atual (auditoria de 2026-06-10)

| Item | Estado |
|---|---|
| `generateMetadata` | ✅ existe em `/pontos-turisticos/[slug]`, `/comercios`, `/vitrine/[slug]/cardapio` e `/catalogo` |
| `generateMetadata` na **vitrine principal** (`/vitrine/[slug]`) | ❌ **não existe — a página mais valiosa do site está sem metadata** |
| `metadataBase` / canonical | ❌ não existe |
| `sitemap.ts` | ❌ não existe |
| `robots.ts` | ❌ não existe |
| JSON-LD (structured data) | ❌ nenhum no projeto |
| Title do root layout | estático e genérico |
| Rotas de categoria | query params (`/comercios?categoria=X`) — rankeiam mal |
| Conteúdo editorial | ❌ não existe |

---

## Faseamento

### Fase 1 — Fundação técnica — ✅ IMPLEMENTADA (2026-06-11)

> O que foi construído: `src/lib/seo/site.ts` (SITE_URL via `NEXT_PUBLIC_SITE_URL`, fallback
> localhost), `metadataBase` + OG defaults no root layout, `src/app/robots.ts` (bloqueia
> `/admin`, `/comerciante`, `/api`, `/busca`), `src/app/sitemap.ts` (estáticas + 6 variações
> de categoria + vitrines ATIVO + pontos ativos, com `revalidate = 3600` — sem isso o sitemap
> seria estático do build), e `generateMetadata` na vitrine (title com categoria + cidade,
> description truncada com fallback, OG image foto→logo, canonical, `noindex` para
> status ≠ ATIVO). Verificado com servidor real: title/canonical/description/OG corretos.

- **`metadataBase` + canonicals** no root layout. Requer definir `NEXT_PUBLIC_SITE_URL`
  no `.env` (produção: domínio final; dev: `http://localhost:3000`).
- **`sitemap.ts` dinâmico** (`src/app/sitemap.ts` — suporte nativo do App Router):
  home, `/comercios` (+ variações de categoria), `/mapa`, `/pontos-turisticos`,
  `/para-comerciantes`, todas as vitrines com `status: ATIVO`, todos os pontos
  turísticos ativos. `lastModified` a partir do `updatedAt`.
- **`robots.ts`** — bloquear `/admin`, `/comerciante`, `/api`, `/busca`; apontar para o sitemap.
- **`generateMetadata` na vitrine** (`/vitrine/[slug]/page.tsx`):
  - title: `"{nome} — {categoria principal legível} em São Bento do Sapucaí | Guia SBS"`
  - description: a partir de `descricao` (truncada ~155 chars) com fallback padrão
  - OG image: `fotos[0]` → `logo` → imagem padrão do site
  - Comércios com `status !== ATIVO`: `robots: { index: false }` (a vitrine em
    pré-visualização não deve ser indexada).
- Revisar titles/descriptions das páginas que já têm metadata (padrão consistente
  `"{página} | Guia SBS"`, sempre citando "São Bento do Sapucaí" — é a keyword âncora).

### Fase 2 — Structured data (JSON-LD) — ✅ IMPLEMENTADA (2026-06-11)

> O que foi construído: `src/lib/seo/jsonld.ts` (builders) + `src/components/seo/json-ld.tsx`
> (injetor com escape de `<` contra XSS). Vitrine emite `Restaurant`/`LodgingBusiness`/`Store`/
> `EntertainmentBusiness`/`LocalBusiness` pela categoria principal (com endereço, geo,
> `openingHoursSpecification` parseado do JSON de horários — dias com pausa viram dois
> intervalos —, telefone, fotos, `sameAs` Instagram e `hasMenu` quando Restaurant com
> cardápio), + `BreadcrumbList` + um `Event` por evento ativo. Pré-visualização não emite
> JSON-LD. Pontos turísticos emitem `TouristAttraction` + breadcrumb; o layout público emite
> `WebSite`. Verificado com servidor real (4 blocos válidos na vitrine de teste).

Todos os dados já existem estruturados no banco; é só mapear para schema.org.
Criar helper centralizado `src/lib/seo/jsonld.ts` e injetar via
`<script type="application/ld+json">` nos Server Components.

| Página | Schema | Campos (origem no banco) |
|---|---|---|
| Vitrine | `LocalBusiness` ou subtipo pela categoria principal — `Restaurant` (ALIMENTACAO), `LodgingBusiness` (HOSPEDAGEM), `Store` (COMERCIO), `LocalBusiness` (demais) | `name`, `description`, `address` (campos de endereço), `geo` (lat/lng), `telephone`, `image` (fotos), `url`, `openingHoursSpecification` (parsear o JSON `horarios` — reusar `src/lib/horarios.ts`), `sameAs` (Instagram) |
| Vitrine com cardápio | `hasMenu` apontando para `/vitrine/[slug]/cardapio` | |
| Ponto turístico | `TouristAttraction` | `name`, `description`, `geo`, `image` |
| Eventos (na vitrine) | `Event` | `nome`, `dataInicio`, `local` = o comércio |
| Detalhes (vitrine, ponto) | `BreadcrumbList` | trilha Home → listagem → item |
| Root layout | `WebSite` | nome + url do site |

Rich results esperados: horário de funcionamento, endereço, fotos e avaliações (futuras)
direto na SERP — é o que diferencia o resultado do guia de um resultado de texto puro.

### Fase 3 — SEO programático e conteúdo (onde as queries genéricas acontecem)

Fichas de comércio não rankeiam para "bate-volta de SP" — conteúdo editorial sim.

- **Rotas estáticas de categoria** — ✅ implementadas (2026-06-11) como rotas top-level
  com slug "guarda-chuva": `/gastronomia`, `/hospedagem`, `/turismo`, `/servicos`,
  `/lojas`, `/entretenimento`. Cada uma com H1 keyword-rich, title/description próprios,
  parágrafo introdutório, breadcrumb JSON-LD e canonical; entram no sitemap no lugar das
  URLs com query param, que agora redirecionam (308). Slug sem a cidade embutida — o
  domínio/subdomínio carrega a cidade (compatível com o multitenant futuro). A copy vive
  centralizada em `src/lib/seo/categorias.ts`.
- **Página "Sobre a cidade"** — ✅ implementada (2026-06-11) em `/sao-bento-do-sapucai`
  (slug rico em keyword) e promovida a item fixo do BottomNav ("A cidade") — link interno em
  todas as páginas. História, como chegar, quando ir, atrações interlinkando os pontos
  turísticos reais, gastronomia e galeria; JSON-LD `TouristDestination`. Revisar/expandir o
  texto conforme o guia crescer.
- ~~**Seção editorial `/guia/[slug]`**~~ — **fora do escopo da V1** (decisão de
  2026-06-11). Artigos editoriais ("Bate-volta de SP", "Guia da Pedra do Baú") que
  interlinkam vitrines e pontos não serão produzidos para o lançamento. As queries de
  descoberta ficam cobertas apenas pela página da cidade (`/sao-bento-do-sapucai`).
  Se voltar ao roadmap pós-V1: começar com MDX no repo (zero infra) e migrar para model
  `Artigo` gerenciado pelo admin se a produção de conteúdo escalar.
- **Interlinking sistemático**: vitrine → sua categoria → pontos turísticos próximos →
  artigos relacionados. O Google entende o site como autoridade no tema "São Bento do
  Sapucaí".

### Fase 4 — Performance e operação contínua (itens de `alt` e OG image ✅ em 2026-06-11)

> Já feitos: **OG image padrão** (`src/app/opengraph-image.jpg`, 1200×630 gerada da foto da
> cidade + `opengraph-image.alt.txt` — fallback para toda página sem imagem própria) e
> **`alt` descritivo com cidade** nos cards públicos (home, listagem, eventos, pontos).

- **ISR** (`revalidate`) nas vitrines, listagens e pontos turísticos — páginas servidas
  estáticas melhoram Core Web Vitals (fator de ranking) e reduzem custo de DB.
- **`alt` descritivo** em todas as imagens públicas (`"{nome do comércio} em São Bento
  do Sapucaí"`).
- **Google Search Console** desde o dia 1: submeter sitemap, monitorar indexação e
  queries reais (as queries reais alimentam a pauta editorial da Fase 3).
- Avaliações de visitantes (feature futura) → `aggregateRating` no JSON-LD — estrelas
  na SERP, grande impacto em CTR.

---

## Decisões em aberto

1. **Domínio de produção** — necessário para `metadataBase`, canonical e Search Console.
2. ~~**Formato das rotas de categoria**~~ — resolvida em 2026-06-11: rotas top-level com
   slug guarda-chuva (`/gastronomia`, `/hospedagem`, `/lojas`, …), sem a cidade no slug
   (multitenant-friendly). `COMERCIO → /lojas` evita colisão com `/comercios`.
3. ~~**Conteúdo editorial: quem escreve?**~~ — resolvida em 2026-06-11: seção editorial
   `/guia` está fora do escopo da V1 (ver Fase 3).

---

## Sinergias com o restante do roadmap

- **Busca por IA** (`docs/busca-inteligente.md`): o pré-requisito para retomar o motor é
  o sistema estar populado — com a `/guia` fora da V1, isso depende do cadastro de
  comércios, produtos e pontos turísticos reais.
- **Avaliações**: quando existirem, viram `aggregateRating` no JSON-LD (estrelas na SERP).
- **Analytics para comerciantes**: "visitas vindas do Google" é métrica de valor direto
  para o comerciante — conecta o investimento em SEO ao argumento de venda do plano pago.
