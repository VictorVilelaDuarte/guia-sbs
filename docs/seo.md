# SEO — Plano de Design e Implementação

> **Status:** planejamento. Implementação em fases (ver seção [Faseamento](#faseamento)).
> **Última atualização:** 2026-06-10
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

### Fase 1 — Fundação técnica (rápido, obrigatório)

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

### Fase 2 — Structured data (JSON-LD) — o maior diferencial para busca local

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

- **Rotas estáticas de categoria**: substituir/complementar `/comercios?categoria=X` por
  rotas dedicadas com slug otimizado (ex.: `/pousadas-em-sao-bento-do-sapucai` ou
  `/comercios/hospedagem`), cada uma com H1 próprio, parágrafo introdutório e a listagem.
  Query params rankeiam mal; rotas dedicadas com conteúdo rankeiam bem. As rotas entram
  no sitemap.
- **Página "Sobre a cidade"** (`/sobre` ou `/sao-bento-do-sapucai`): história, como chegar
  (distâncias de SP/Campinas/aeroportos), quando ir (clima por estação), principais
  atrações (interlinkando os pontos turísticos), gastronomia local (truta, pinhão),
  galeria. Captura o topo do funil — quem pesquisa a cidade antes de decidir a viagem —
  e constrói autoridade temática do domínio inteiro.
- **Seção editorial `/guia/[slug]`**: artigos como "Bate-volta de SP: roteiro de 1 dia",
  "O que fazer em São Bento do Sapucaí", "Onde ficar na Mantiqueira", "Guia da Pedra do
  Baú". Cada artigo interlinha vitrines e pontos do sistema (o conteúdo trabalha duplo:
  rankeia e direciona tráfego para os comércios — argumento de venda do plano pago).
  Implementação: começar com MDX no repo (zero infra) e migrar para model `Artigo`
  gerenciado pelo admin se a produção de conteúdo escalar.
- **Interlinking sistemático**: vitrine → sua categoria → pontos turísticos próximos →
  artigos relacionados. O Google entende o site como autoridade no tema "São Bento do
  Sapucaí".

### Fase 4 — Performance e operação contínua

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
2. **Formato das rotas de categoria** — slug "bonito" (`/pousadas-em-sao-bento-do-sapucai`)
   vs. hierárquico (`/comercios/hospedagem`). O bonito rankeia melhor; o hierárquico é
   mais simples de manter. Decidir antes da Fase 3.
3. **Conteúdo editorial: quem escreve?** MDX no repo (Victor escreve) vs. model `Artigo`
   no admin. Sugestão: começar com MDX.

---

## Sinergias com o restante do roadmap

- **Busca por IA** (`docs/busca-inteligente.md`): a Fase 3 de conteúdo popula o sistema —
  exatamente o pré-requisito definido para retomar o motor de busca.
- **Avaliações**: quando existirem, viram `aggregateRating` no JSON-LD (estrelas na SERP).
- **Analytics para comerciantes**: "visitas vindas do Google" é métrica de valor direto
  para o comerciante — conecta o investimento em SEO ao argumento de venda do plano pago.
