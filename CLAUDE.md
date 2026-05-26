# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Projeto

**Guia SBS** — o melhor guia digital da cidade de São Bento do Sapucaí, SP (cidade turística na Serra da Mantiqueira). A visão é ser uma plataforma completa: comércios locais com perfis ricos, eventos da cidade, mapa interativo, busca, e muito mais.

Dois públicos principais:
- **Comerciante:** gerencia seu próprio perfil (informações, fotos, produtos, eventos, palavras-chave) via dashboard privado.
- **Visitante/turista:** consulta o guia público sem login — comércios, eventos, mapa.

Administradores aprovam e gerenciam os comércios. Os perfis públicos ficam em `/vitrine/[slug]` (slug gerado automaticamente a partir do nome na criação do comércio).

**Modelo de negócio:** SaaS B2B local — comerciantes pagam planos para acessar recursos da plataforma. Os planos são configuráveis pelo admin (model `Plan` no banco), cada um com um conjunto de features habilitadas via JSON. Ao implementar novas features, considerar se faz sentido restringi-las a planos pagos via feature flag.

## Como trabalhar neste projeto

- O dono (Victor) é dev experiente com Next.js — sem necessidade de explicações básicas.
- Pode criar arquivos e fazer mudanças livremente, sem pedir confirmação.
- Sempre explicar o **motivo** das decisões técnicas e estruturais ao implementá-las.

## Comandos

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run lint         # ESLint
npm run db:push      # sincroniza schema Prisma com o banco (sem migration)
npm run db:migrate   # cria migration Prisma (dev)
npm run db:seed      # cria o super admin padrão (admin@guiasbs.com.br / admin123)
```

## Variáveis de Ambiente (`.env`)

```env
DATABASE_URL="postgresql://..."   # dev: porta 5432 direta. produção (Vercel): pooler porta 6543 com ?pgbouncer=true
DIRECT_URL="postgresql://..."     # sempre porta 5432 direta (usado pelo Prisma para migrations)
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
```

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| Linguagem | TypeScript 5 |
| UI | Tailwind CSS 4 + shadcn/ui + @base-ui/react |
| ORM | Prisma 6 + PostgreSQL via Supabase |
| Autenticação | NextAuth v5 (JWT + Credentials) |
| Storage | Supabase Storage (REST API direta — sem SDK) |
| Mapas | Leaflet 1.9.4 (sempre com `next/dynamic` + `ssr: false`) |
| Geocoding | Nominatim / OpenStreetMap (sem API key) |
| CEP | ViaCEP (sem API key) |
| Validação | Zod |
| Datas | date-fns com locale ptBR |
| Toasts | Sonner |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable (cardápio) |
| Conversão HEIC | heic2any (client-side, HEIC→JPEG antes do upload) |

## Arquitetura

### Roles e controle de acesso

Três roles: `SUPER_ADMIN`, `ADMIN`, `COMERCIANTE`. O JWT armazena `id` e `role` (ver `src/lib/auth.ts` e `src/types/next-auth.d.ts`). O middleware (`src/middleware.ts`) protege `/admin/*` (requer ADMIN/SUPER_ADMIN) e `/comerciante/*` (requer COMERCIANTE). O único ponto de login é `/admin/login` para todos os roles.

Hierarquia de permissões relevante nas APIs:
- Apenas `SUPER_ADMIN` pode criar/editar/excluir usuários ADMIN e SUPER_ADMIN.
- `ADMIN` e `SUPER_ADMIN` podem criar comerciantes e gerenciar comércios.
- `COMERCIANTE` só acessa as próprias rotas em `/api/comerciante/*`.

### Rotas de API

Todas as APIs verificam a sessão via `auth()` do NextAuth no próprio handler — o middleware não substitui essa verificação. Padrão de guard usado em todas as rotas:

```ts
// Admin
const session = await auth()
if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return 401

// Comerciante
const session = await auth()
if (!session || session.user.role !== "COMERCIANTE") return 401
```

### Dashboard do comerciante

`/comerciante/dashboard/page.tsx` é um Server Component que busca o comércio completo (com fotos, tags, produtos, eventos, cardápio) e passa para `<DashboardTabs>` (Client Component). As abas são: Informações, Fotos, Cardápio, **Produtos**, **Serviços**, Eventos, Palavras-chave. Abas controladas por feature flags do plano são ocultadas quando a feature não está disponível.

As abas Produtos e Serviços são instâncias separadas de `<ProdutosManager>` com `tipo="PRODUTO"` e `tipo="SERVICO"` respectivamente. O manager filtra `p.tipo === tipo && !p.categoriaCardapioId` para mostrar apenas itens do catálogo (não vinculados ao cardápio).

### Vitrine pública

`/vitrine/[slug]/page.tsx` — Server Component público. Exibe identidade, status aberto/fechado, CTAs rápidos, galeria de fotos, destaques do cardápio, destaques de produtos/serviços do catálogo, eventos, horários, mapa e contatos. Comércios com `status !== ATIVO` mostram banner de pré-visualização mas não bloqueiam o acesso.

**Ordem das seções:** Fotos → Cardápio (destaques) → Produtos em destaque → Serviços em destaque → Eventos → Horários → Localização → Contato.

Cada seção de destaques usa `<CardapioDestaquesVitrine>` (Client Component em `src/components/public/cardapio-destaques-vitrine.tsx`) que gerencia o state do bottom sheet localmente — necessário porque o Server Component não pode manter state.

Status aberto/fechado usa `Intl.DateTimeFormat` com `timeZone: "America/Sao_Paulo"` — calculado no servidor. Quando fechado, exibe "Volta amanhã às HH:MM" ou "Volta [dia] às HH:MM" com base no próximo dia com abertura cadastrada.

### Upload de imagens

Rota única `/api/comerciante/upload` com parâmetro `tipo` (`logo`, `produto`, `evento`, `cardapio`, ou omitido para fotos). O storage usa a `SERVICE_ROLE_KEY` diretamente via fetch REST (sem SDK Supabase). Estrutura de paths no bucket `comercios`:

**Upload de fotos de produtos (cardápio):** o componente `produto-dialog.tsx` suporta múltiplos arquivos simultâneos, drag-and-drop e conversão de HEIC/HEIF para JPEG antes do envio (via `heic2any`). A detecção de HEIC usa tanto o MIME type quanto a extensão do arquivo (iOS Safari às vezes omite o MIME type). A quantidade máxima de slots disponíveis (`MAX_IMAGENS - imagens.length`) limita dinamicamente tanto o seletor de arquivos (`multiple` é `false` quando só resta 1 slot) quanto o drop handler.

```
{userId}/logo.{ext}
{userId}/fotos/{timestamp}.{ext}
{userId}/produtos/{timestamp}.{ext}
{userId}/eventos/{timestamp}.{ext}
{userId}/cardapio/{timestamp}.{ext}
```

### Auth config separada (Edge-compatible)

O middleware roda no Edge runtime da Vercel (limite de 1 MB). Para não ultrapassar o limite, a config do NextAuth está dividida em dois arquivos:

- `src/auth.config.ts` — config leve com só os callbacks JWT e sem providers. Importado pelo middleware.
- `src/lib/auth.ts` — config completa com Credentials provider, Prisma e bcryptjs. Importado pelas API routes e Server Components.

**Nunca importe `@/lib/auth` no middleware** — isso puxa Prisma + bcryptjs e estoura o limite do Edge.

### Slug de comércio

`src/lib/slugify.ts` — utilitário que normaliza NFD, remove diacríticos e converte para kebab-case. Usado na criação do comércio (`/api/admin/comercios`) para gerar slug único com sufixo numérico caso já exista (ex: `chao-bento-2`).

### Bottom sheet de produto (cardápio público)

`src/components/public/produto-bottom-sheet.tsx` — exibe detalhes do produto selecionado em um painel deslizante de baixo para cima, com carrossel de imagens, thumbnails, variações de preço e animação de entrada/saída.

**Portal e `#portal-root`:** o sheet é renderizado via `createPortal` para `#portal-root` (fallback: `document.body`). O `#portal-root` está declarado em `src/app/layout.tsx` como irmão da div principal, fora de qualquer contexto flex — isso é intencional:

```tsx
<body>
  <div className="min-h-full flex flex-col">{children}</div>
  <div id="portal-root" />   {/* fora do flex — isolado */}
</body>
```

**Bug Safari iOS — `position: fixed` dentro de flex:** quando `<body>` tem `display: flex`, elementos com `position: fixed` podem usar o container flex como containing block em vez do viewport. O sheet fica mais estreito que a tela. A solução é **não usar `position: fixed` no sheet em si**: um wrapper externo único com `position: fixed; inset: 0` cobre 100% do viewport (garantido), e o backdrop + sheet usam `position: absolute` dentro dele. Nunca mova o sheet para `position: fixed` diretamente.

**Scroll lock no iOS Safari:** `overflow: hidden` no body é ignorado pelo iOS Safari quando há scroll. A solução correta é salvar `window.scrollY`, aplicar `position: fixed; top: -scrollY; width: 100%` no body ao abrir, e restaurar tudo (incluindo `window.scrollTo`) ao fechar. Isso é feito via `useEffect` dentro do bottom sheet quando `isVisible` muda.

**Carrossel:** cada slide usa `absolute inset-0` + `translateX((i - currentIndex) * 100%)`. **Não use** a abordagem flex-track (`display: flex` no container + `w-full shrink-0` nos slides) — o `w-full` no filho flex cria uma dependência circular de largura e o carrossel fica estreito no mobile.

**Gestos:** arrastar o handle vertical > 80px fecha o sheet. Swipe horizontal no carrossel navega entre fotos. Os estados de toque usam `useRef` para evitar re-renders durante o gesto.

### Galeria de fotos pública

`src/components/public/galeria-fotos.tsx` — carrossel horizontal com lightbox fullscreen.

- Carrossel: `overflow-x-auto -mx-4 px-4` (mesma convenção do CTA strip — sem `snap-*`, pois o snap quebra o alinhamento com o padding). **Não adicione snap classes aqui.**
- Lightbox: pinch-to-zoom via listener `touchmove` não-passivo (`{ passive: false }` + `e.preventDefault()`). Refs espelham state para evitar stale closures em event listeners DOM.
- Todas as cores do lightbox são `rgba()` inline — classes Tailwind de opacidade (`text-white/70`, `bg-black/40`) não funcionam em alguns browsers móveis.
- `key={indice}` no componente `<Lightbox>` reseta zoom/pan ao trocar foto sem useEffect.

### Mapa (Leaflet)

Leaflet exige importação com `next/dynamic` + `ssr: false`. O padrão adotado é ter um wrapper `*-dynamic.tsx` (Client Component) que faz o dynamic import do componente real. Nunca importe componentes Leaflet diretamente em Server Components.

O CSS do Leaflet é importado localmente (`import "leaflet/dist/leaflet.css"` dentro do componente) — **não use CDN**, pois falha em redes locais. O popup do mapa exibe o logo do comércio (72×72px) quando disponível, ou o nome como fallback.

### Horários de funcionamento

Armazenados como JSON string no campo `horarios` do comércio. Estrutura esperada:

```json
[
  { "dia": "Segunda", "aberto": true, "inicio": "08:00", "fim": "18:00", "temPausa": false },
  ...
]
```
Array sempre com 7 elementos (Segunda a Domingo). O campo `temPausa`, `pausaInicio` e `pausaFim` são opcionais.

## Banco de Dados

Entidades principais: `Plan` → `Comercio` (N:1) ← `User` (1:1). `Comercio` → `Tag[]`, `Foto[]`, `Produto[]`, `Evento[]`, `CardapioCategoria[]`. `CardapioCategoria` → `CardapioItem[]` → `CardapioVariacao[]`. Todas as relações têm `onDelete: Cascade`. IDs gerados com `cuid()`.

Enums:
- `Role`: SUPER_ADMIN | ADMIN | COMERCIANTE
- `ComercioStatus`: PENDENTE | ATIVO | INATIVO | REJEITADO
- `Categoria`: RESTAURANTE | HOSPEDAGEM | TURISMO | SERVICO | COMERCIO | ENTRETENIMENTO
- `TipoProduto`: PRODUTO | SERVICO

> O enum `PlanType` (FREE/PREMIUM) foi substituído pelo model `Plan` — ver seção Planos abaixo.

### Planos e feature flags

Planos são gerenciados pelo admin em `/admin/planos`. Cada comércio está associado a um `Plan` (relação N:1). O model `Plan` tem um campo `features: Json` com as features habilitadas para aquele plano.

Features disponíveis (definidas em `src/lib/plan-features.ts`):

| Key | Descrição |
|---|---|
| `cardapio` | Cardápio digital com categorias e itens |
| `catalogo` | Catálogo público de produtos e serviços (sem categorias) |
| `eventos` | Criar e exibir eventos no perfil público |
| `fotos_ilimitadas` | Upload sem limite (FREE tem limite de 3 fotos) |
| `destaque_busca` | Perfil em posição destacada nos resultados |
| `analytics` | Estatísticas de visualizações e cliques |
| `qr_code` | QR Code personalizado do perfil |

A função `temFeature(features, key)` verifica se uma feature está ativa. Usada no perfil público e no dashboard para controlar acesso às abas e seções.

Limites do plano FREE (definidos em `LIMITES_FREE` no mesmo arquivo): `fotos: 3`, `tags: 5`, `produtos: 3`.

### Cardápio digital

Feature controlada pelo plano (`key: "cardapio"`). Estrutura de dados:

```
CardapioCategoria (nome, ordem)
  └── CardapioItem (titulo, descricao, preco, imagens String[], disponivel, ordem)
        └── CardapioVariacao (nome, preco, ordem)
```

> `imagens` é um array nativo PostgreSQL (`String[]`). A primeira posição é usada como thumbnail em listas. O limite de 3 fotos é validado no payload (Zod `.max(3)`) — não no banco.

**Variações de preço:** quando um item tem variações (ex: Cápsula / Artesanal, Pequeno / Grande), o campo `preco` do `CardapioItem` fica `null` e os preços são armazenados em `CardapioVariacao`. No perfil público, as variações são exibidas como colunas com o nome em uppercase e o preço abaixo (layout tipo cardápio de cafeteria).

**APIs** em `/api/comerciante/cardapio/`:
- `GET /` — retorna todas as categorias com itens e variações
- `POST/PATCH/DELETE /categorias` e `/categorias/[id]` — CRUD de categorias
- `POST /itens` e `PATCH/DELETE /itens/[id]` — CRUD de itens; o payload aceita `variacoes[]` (quando presente, substitui todas as variações existentes via transaction; quando ausente, preserva as variações — útil para toggles de disponibilidade)
- `PATCH /ordem` — reordenação de categorias e itens via drag-and-drop; aceita `{ tipo: "categoria", ids }` ou `{ tipo: "item", categoriaId, ids }`

**Componentes do painel** em `src/components/comerciante/cardapio/`:
- `manager.tsx` — lista com drag-and-drop (@dnd-kit), colapso de categorias, ações inline
- `produto-dialog.tsx` — formulário unificado para produtos do catálogo e itens do cardápio, com galeria de até 3 fotos (multi-seleção, drag-and-drop, HEIC), alternância preço único/variações, toggle de **destaque** (sempre visível, independente de cardápio) e seção "Incluir no cardápio" (oculta para serviços)
- `categoria-dialog.tsx` — formulário simples de categoria
- `sortable-wrappers.tsx` — wrappers do @dnd-kit para categorias e itens
- `types.ts` — interfaces `CardapioCategoria`, `CardapioItem`, `CardapioVariacao`, `ItemFormState`, `TipoProduto`
- `utils.ts` — `formatPreco`, `parsePreco`, `displayPreco`

**Componentes públicos** em `src/components/public/cardapio/`:
- `types.ts` — interfaces `Variacao`, `Produto`, `Categoria` + funções `formatBRL`, `isPromoAtiva`
- `item-row.tsx` — linha de item na listagem (thumbnail, título, descrição, preço/variações)
- `destaque-card.tsx` — card no carrossel horizontal de destaques (usado tanto no cardápio completo quanto na vitrine)

O orquestrador do cardápio completo é `src/components/public/cardapio-view.tsx` — gerencia tabs, busca, IntersectionObserver para tab ativa e abre o `ProdutoBottomSheet`.

### Catálogo de produtos e serviços

Feature controlada pelo plano (`key: "catalogo"`). Produtos e serviços são instâncias do mesmo model `Produto`, diferenciados pelo campo `tipo: TipoProduto` (PRODUTO | SERVICO). Um produto pode estar no catálogo **ou** no cardápio — não nos dois ao mesmo tempo (por ora): `categoriaCardapioId != null` indica que pertence ao cardápio.

**Flag `destaque`:** campo independente no model `Produto`. Não requer cardápio vinculado. Produtos com `destaque: true` aparecem na vitrine do comércio no carrossel horizontal da seção correspondente (Cardápio, Produtos ou Serviços). Para o cardápio, a query filtra `destaque: true` nas `cardapioCategorias`; para o catálogo, filtra `destaque: true, categoriaCardapioId: null` nos `produtos`.

**Página pública do catálogo:** `/vitrine/[slug]/catalogo` — grid 2 colunas (3 em telas maiores), tabs Produtos/Serviços, busca, reusa `ProdutoBottomSheet`. Retorna 404 se a feature não estiver habilitada ou se não houver itens disponíveis.

**Componentes:**
- `src/components/public/catalogo-view.tsx` — grid público de produtos e serviços
- `src/components/public/cardapio-destaques-vitrine.tsx` — carrossel de destaques para a vitrine (Client Component wrapper necessário pois a vitrine é Server Component)
- `src/components/comerciante/produtos-manager.tsx` — lista de produtos/serviços do catálogo no painel, com prop `tipo` para filtrar

## Fontes

- Serif: `Fraunces` (variável `--font-serif`)
- Sans: `Plus Jakarta Sans` (variável `--font-sans`)

### Zoom e viewport em páginas de cardápio

A página `/vitrine/[slug]/cardapio` exporta `export const viewport: Viewport = { userScalable: false }` para desabilitar pinch-to-zoom (comportamento esperado num cardápio estilo app). Qualquer `<input>` nessas páginas deve usar `text-[16px]` (ou maior) para evitar o auto-zoom do iOS Safari ao focar campos com fonte < 16px.

## Próximas features planejadas

- Busca full-text (PostgreSQL `tsvector` com dicionário português)
- Página pública de listagem de comércios por categoria
- Página pública de eventos da cidade (`/eventos`)
- Avaliações de visitantes
- Analytics para comerciantes (visualizações, cliques) — feature flag já existe, falta implementar
- QR Code do perfil para impressão — feature flag já existe, falta implementar
- Produto simultâneo no cardápio e no catálogo (atualmente exclusivos)
