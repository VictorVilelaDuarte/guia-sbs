# Guia SBS / AIRotas — Panorama Técnico Completo

> **Documento de contexto.** Descreve o estado real do código em `main`+`feat/admin-edita-comercio`
> (último commit: `ad969b8`, 2026-09-01). Escrito para ser lido por outra sessão/agente que vai
> discutir **integração deste projeto com serviços externos**.
>
> Fontes: `prisma/schema.prisma`, `src/**`, `docs/*.md`, `CLAUDE.md`. Onde há divergência entre
> documento e código, o **código** foi tomado como verdade.
>
> ⚠️ `DOCUMENTATION.md` (raiz) está **desatualizado** (cita Leaflet, que foi removido; não cobre
> cardápio, catálogo, hospedagem, pedidos, analytics, SEO). Ignorar em favor deste arquivo e do
> `CLAUDE.md`.

### Índice

1. O que é o produto · 2. Stack e arquitetura · 3. Modelo de dados (3.5 = cardápio/produtos) ·
4. Features implementadas · 5. Pedidos online ponta a ponta · 6. Superfície de API ·
7. Documentação existente · 8. Convenções e armadilhas · 9. Limitações conhecidas ·
10. Backlog planejado · 11. Notas para integração

---

## 1. O que é o produto

**Guia SBS** é o guia digital da cidade de **São Bento do Sapucaí, SP** (turismo, Serra da
Mantiqueira). Duas faces:

- **Pública (visitante/turista, sem login):** home, listagens de comércio por categoria, vitrine
  de cada comércio (`/vitrine/[slug]`), cardápio digital, catálogo de produtos/serviços, eventos
  da cidade, pontos turísticos, mapa interativo, página institucional da cidade.
- **Privada:** dashboard do **comerciante** (gerencia o próprio perfil) e painel **admin**
  (aprova comércios, gerencia planos, subcategorias, usuários, pontos turísticos, bairros, e pode
  operar o painel completo de qualquer comércio).

**Modelo de negócio:** SaaS B2B local. Comerciantes assinam **planos** (model `Plan`) e cada plano
liga/desliga **feature flags** guardadas num JSON. A marca nova (**AIRotas**) hoje só aparece na
landing `/para-comerciantes`; o rebrand global está atrelado ao plano multitenant (§10.2).

**Escala atual:** cidade única, dezenas a poucas centenas de comércios. Nada foi projetado para
alto volume — a arquitetura é deliberadamente simples (sem fila, sem cache distribuído, sem
worker).

---

## 2. Stack e arquitetura geral

### 2.1 Resumo

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16.2.4** (App Router, React 19.2.4) |
| Linguagem | TypeScript 5 |
| Runtime | Node.js (Vercel serverless) + **Edge runtime** só no middleware |
| UI | Tailwind CSS 4 + shadcn/ui + `@base-ui/react` + lucide-react |
| ORM | **Prisma 6** (`@prisma/client` 6.19) |
| Banco | **PostgreSQL** gerenciado pelo **Supabase** |
| Auth | **NextAuth v5 (beta)** — JWT + Credentials provider + bcryptjs |
| Storage de arquivos | **Supabase Storage**, acessado por **REST direto com service-role key** (o SDK Supabase **não** é usado) |
| Mapas | Google Maps JS API (`@googlemaps/js-api-loader` v2 + `markerclusterer`) |
| Geocoding | Nominatim / OpenStreetMap (sem key) |
| CEP | ViaCEP (sem key) |
| Push | **Web Push** (`web-push` + VAPID + service worker próprio) |
| Validação | **Zod 4** em todas as rotas de escrita |
| Datas | date-fns (locale ptBR) + `Intl.DateTimeFormat` com `timeZone: "America/Sao_Paulo"` |
| Drag-and-drop | `@dnd-kit` (cardápio, fotos) |
| Imagens HEIC | `heic2any` no client (HEIC→JPEG antes do upload), **sempre por import dinâmico** |
| Toasts | Sonner |
| Deploy | Vercel |

### 2.2 Forma da arquitetura

**Monolito Next.js.** Não há serviços separados, nem backend próprio, nem fila, nem cron, nem
worker. Tudo é:

- **Server Components** que consultam o Postgres direto via Prisma (a maior parte das leituras
  públicas **não** passa por API HTTP), e
- **Route Handlers** (`src/app/api/**/route.ts`) para todas as escritas e para o que o client
  precisa buscar dinamicamente.

Serviços externos usados hoje: **Supabase** (Postgres + Storage), **Google Maps**, **ViaCEP**,
**Nominatim**, **Web Push (endpoints dos browsers: FCM/Mozilla/Apple)**, **Vercel**. Não há
gateway de pagamento, ERP, PDV, e-mail transacional, WhatsApp API, CRM, nem fila de mensagens.

### 2.3 Conexões com o banco

```env
DATABASE_URL   # prod: pooler Supabase porta 6543 com ?pgbouncer=true | dev: 5432 direta
DIRECT_URL     # sempre 5432 direta — usado por migrations e DDL
```
DDL manual sempre pelo `DIRECT_URL` (o pooler trava operações de schema).

### 2.4 Autenticação e autorização

- Três roles: `SUPER_ADMIN`, `ADMIN`, `COMERCIANTE` (enum `Role`).
- **Login único** para todos em `/admin/login`. JWT (cookie de sessão do NextAuth) guarda `id` e
  `role`.
- `src/middleware.ts` (Edge) protege `/admin/*` e `/comerciante/*` e faz redirects por role.
- **O middleware não substitui a verificação nas APIs**: toda rota chama `auth()` no próprio
  handler.
- A config do NextAuth é dividida em dois arquivos por causa do limite de 1 MB do Edge:
  - `src/auth.config.ts` — leve, só callbacks, **é a que o middleware importa**;
  - `src/lib/auth.ts` — completa (Prisma + bcryptjs), usada por APIs e Server Components.
  - `authConfig` define `trustHost: true` (obrigatório no Auth.js v5 fora de dev/Vercel).
- **Não existe autenticação por API key, OAuth client, nem token de máquina.** Toda API privada é
  autenticada por **cookie de sessão do browser**. Isso é o principal ponto de atrito para
  integração externa (§11).

**`getComercioCtx()`** (`src/lib/comercio-ctx.ts`) é o guard único de `/api/comerciante/*`:
sessão `COMERCIANTE` resolve o comércio por `ownerId`; sessão `ADMIN`/`SUPER_ADMIN` resolve pelo
cookie httpOnly `admin_comercio_id` (gravado pelo middleware ao abrir
`/admin/comercios/[id]/gerenciar`). O cookie é ignorado para não-admins. Retorna
`{ comercioId, ownerId, isAdmin, features }`.

### 2.5 Storage de imagens

Bucket público `comercios` no Supabase Storage, escrito via `fetch` REST com
`SUPABASE_SERVICE_ROLE_KEY` (`src/lib/supabase-storage.ts`). Rota única de upload
`POST /api/comerciante/upload` (máx. **5 MB** por arquivo), com parâmetro `tipo`:

```
{userId}/logo.{ext}
{userId}/fotos/{ts}.{ext}
{userId}/produtos/{ts}.{ext}
{userId}/eventos/{ts}.{ext}
{userId}/cardapio/{ts}.{ext}
{userId}/quartos/{ts}.{ext}
pontos-turisticos/{pontoId}/{ts}.{ext}   # via rota do admin
```
As URLs públicas resultantes são gravadas como `String`/`String[]` nos models (não há tabela de
assets, exceto `Foto` para a galeria do comércio).

### 2.6 Variáveis de ambiente

```env
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
NEXT_PUBLIC_SITE_URL=                 # metadataBase, sitemap, robots, JSON-LD
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=      # obrigatória para /mapa e MapaView
NEXT_PUBLIC_VAPID_PUBLIC_KEY=         # Web Push (client)
VAPID_PRIVATE_KEY=                    # Web Push (server)
VAPID_SUBJECT=                        # mailto: do contato
# planejada, ainda não usada: VOYAGE_API_KEY (busca por IA — ver §10.1)
```

### 2.7 Scripts

```bash
npm run dev | build | start | lint
npm run db:push          # prisma db push
npm run db:migrate       # prisma migrate dev
npm run db:seed          # super admin padrão (admin@guiasbs.com.br / admin123)
npm run db:seed:bairros  # catálogo de bairros de entrega (SBS + Gonçalves/MG)
```

---

## 3. Modelo de dados

Postgres via Prisma. IDs são `cuid()`. Todos os models estão em `prisma/schema.prisma`
(fonte única; não há migrations versionadas para tudo — parte do schema foi aplicada com
`db push` e DDL manual).

### 3.1 Mapa de entidades

```
Plan 1─N Comercio N─1 User(owner)          User 1─N Session
Comercio 1─N Tag | Foto | Evento | Produto | CardapioCategoria | CatalogoCategoria
Comercio N─M Subcategoria            (join implícita _ComercioToSubcategoria)
Comercio 1─1 HospedagemPerfil        Comercio 1─N TipoQuarto
Comercio 1─1 PedidoConfig            Comercio 1─N Pedido 1─N PedidoItem
Comercio 1─N PushSubscription        Comercio 1─N ZonaEntrega N─1 Bairro
Comercio 1─N AnalyticsEvent
PontoTuristico  (independente, sem FK)
Bairro          (catálogo global da cidade)

CardapioCategoria 1─N Produto 1─N CardapioVariacao
CatalogoCategoria 1─N Produto
```

`onDelete: Cascade` em quase tudo que pende de `Comercio`; **exceções**:
`Produto.categoriaCardapioId` e `Produto.categoriaCatalogoId` são `SetNull`, e
`ZonaEntrega.bairroId` é `SetNull`.

### 3.2 Enums

| Enum | Valores |
|---|---|
| `Role` | `SUPER_ADMIN`, `ADMIN`, `COMERCIANTE` |
| `ComercioStatus` | `PENDENTE`, `ATIVO`, `INATIVO`, `REJEITADO` |
| `Categoria` | `ALIMENTACAO`, `HOSPEDAGEM`, `TURISMO`, `SERVICO`, `COMERCIO`, `ENTRETENIMENTO` |
| `TipoProduto` | `PRODUTO`, `SERVICO` |
| `CategoriaPonto` | `MIRANTE`, `TRILHA`, `HISTORICO`, `CACHOEIRA` |
| `Dificuldade` | `FACIL`, `MODERADA`, `DIFICIL` |
| `PedidoStatus` | `AGUARDANDO`, `ACEITO`, `EM_PREPARO`, `PRONTO`, `SAIU_ENTREGA`, `CONCLUIDO`, `RECUSADO`, `CANCELADO` |
| `TipoEntrega` | `ENTREGA`, `RETIRADA` |

### 3.3 `Comercio` (entidade central)

`id, slug @unique, nome, descricao, categorias Categoria[], status, planId, cep, endereco,
numero, bairro, cidade, estado, lat, lng, telefone, whatsapp, email, website, instagram,
horarios (String — JSON), logo, ownerId @unique, createdAt, updatedAt` → tabela `comercios`.

- **`categorias` é array nativo Postgres**; `categorias[0]` é a **categoria principal**.
  Filtrar com `{ categorias: { has: "ALIMENTACAO" } }`; contar exige raw
  (`SELECT unnest(categorias) …`) porque `groupBy` do Prisma não suporta arrays.
- **`horarios`** é uma **string JSON** com array de 7 objetos (Segunda→Domingo):
  ```json
  { "dia": "Segunda", "aberto": true, "inicio": "08:00", "fim": "18:00",
    "temPausa": false, "pausaInicio": "12:00", "pausaFim": "13:30" }
  ```
  As funções de horário (`parseHorarios`, `getDiaAtual`, `estaAbertoAgora`, …) vivem em
  `src/lib/horarios.ts` e sempre calculam em `America/Sao_Paulo`, **no servidor**.
- `slug` gerado por `src/lib/slugify.ts` na criação (sufixo numérico em colisão).

### 3.4 Planos e feature flags

`Plan`: `id, slug @unique, nome, descricao, preco Float, features Json, ativo, ordem`.

`features` é um objeto `{ [key]: true }`. Chaves válidas (`src/lib/plan-features.ts`):

| Key | O que libera |
|---|---|
| `cardapio` | cardápio digital (categorias + itens + variações) e a página pública `/vitrine/[slug]/cardapio` |
| `catalogo` | catálogo público de produtos e serviços (`/vitrine/[slug]/catalogo`) |
| `pedido_online` | carrinho + checkout + aba Pedidos (**depende de `cardapio`**) |
| `eventos` | criar/exibir eventos |
| `fotos_ilimitadas` | remove o limite de fotos |
| `destaque_busca` | aparece na seção "Em destaque" da home |
| `analytics` | painel completo de analytics (sem a flag, o comerciante vê só visitas + teaser) |
| `qr_code` | QR Code do perfil — **flag existe, feature não implementada** |

Helper: `temFeature(features, key)`. Limites do plano gratuito (`LIMITES_FREE`):
`fotos: 3`, `tags: 5`, `produtos: 3`, `quartos: 2`.

> Hospedagem **não** é feature de plano: é liberada pela **categoria** `HOSPEDAGEM` do comércio.

### 3.5 Cardápio, produtos e catálogo — modelo detalhado

Este é o núcleo pedido pela outra sessão. **Há um único model de item: `Produto`.** Ele serve
simultaneamente ao cardápio (delivery/alimentação) e ao catálogo (produtos e serviços).

#### `Produto` → tabela `produtos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `tipo` | `TipoProduto @default(PRODUTO)` | `PRODUTO` \| `SERVICO` |
| `titulo` | `String` | máx. 120 (Zod) |
| `descricao` | `String? @db.Text` | máx. 1000 (Zod) |
| `preco` | `Float?` | **`null` quando o item tem variações** — o preço então vive em `CardapioVariacao` |
| `imagens` | `String[]` | array nativo PG de URLs públicas do Supabase. **Máx. 3 validado no Zod**, não no banco. `imagens[0]` é a thumb |
| `disponivel` | `Boolean @default(true)` | **é o único controle de disponibilidade — não há estoque** (§5.6) |
| `destaque` | `Boolean @default(false)` | aparece no carrossel de destaques da vitrine; independe de cardápio |
| `precoPromo` | `Float?` | preço promocional |
| `promoFim` | `DateTime?` | promo ativa se `precoPromo != null && (promoFim == null \|\| promoFim > agora)` |
| `ordem` | `Int @default(0)` | ordenação manual (drag-and-drop) |
| `comercioId` | `String` | FK → `Comercio`, `Cascade` |
| `categoriaCardapioId` | `String?` | FK → `CardapioCategoria`, `SetNull`. **`!= null` ⇒ o item é do CARDÁPIO** |
| `categoriaCatalogoId` | `String?` | FK → `CatalogoCategoria`, `SetNull`. Opcional; sem ela o item cai no bloco "Outros" |
| `createdAt` / `updatedAt` | `DateTime` | |

Relações: `comercio`, `categoriaCardapio`, `categoriaCatalogo`, `variacoes CardapioVariacao[]`.

**Regra de partição (importante):** um `Produto` está no **cardápio** ou no **catálogo**, nunca
nos dois. O discriminador é `categoriaCardapioId`:

```
categoriaCardapioId != null  → item do cardápio
categoriaCardapioId == null  → item do catálogo (aba Produtos ou Serviços, por `tipo`)
```
"Produto simultâneo no cardápio e no catálogo" está no backlog (§10.4).

#### `CardapioCategoria` → `cardapio_categorias`
`id, nome, ordem, comercioId, createdAt, updatedAt`. Cascade no comércio. Sem `tipo` — o cardápio
é sempre de itens consumíveis.

#### `CatalogoCategoria` → `catalogo_categorias`
`id, nome, **tipo TipoProduto**, ordem, comercioId, timestamps`. Categorias são **separadas por
tipo**: uma categoria de `PRODUTO` não aparece para serviços e vice-versa (cada aba tem sua
própria sequência de `ordem`). As APIs validam que a categoria é do **mesmo comércio e do mesmo
tipo** do item.

#### `CardapioVariacao` → `cardapio_variacoes`
`id, nome, preco Float (obrigatório), ordem, produtoId` — Cascade no produto.

Usado para "Pequeno/Grande", "Cápsula/Artesanal" etc. Quando existem variações, `Produto.preco`
fica `null` e o preço efetivo de cada linha é o da variação escolhida. Na vitrine as variações
aparecem como colunas (estilo cardápio de cafeteria).

#### Como o cardápio público é montado
`/vitrine/[slug]/cardapio` (Server Component) faz **uma query**: `cardapioCategorias` ordenadas
por `ordem`, incluindo `produtos where { disponivel: true }` ordenados por `ordem`, incluindo
`variacoes` ordenadas. Categorias sem produtos são descartadas; se sobrar zero categorias, a
página retorna **404**. A página também é 404 se o plano não tem a feature `cardapio`.

### 3.6 Hospedagem

- `HospedagemPerfil` (1:1 com `Comercio`, criado sob demanda): `comodidades String[]`,
  `checkIn`, `checkOut`, `politicaCancelamento`, `aceitaPets`, `aceitaCriancas`,
  `formasPagamento String[]`, `observacoes`.
- `TipoQuarto` (N:1): `nome, descricao, precoNoite Float?, capacidade, camas, tamanhoM2,
  comodidades String[], fotos String[], ordem, ativo`.
- Catálogo de comodidades e formas de pagamento em `src/lib/hospedagem.ts`.
- **Sem motor de reservas**: o CTA de cada quarto abre WhatsApp com mensagem pré-preenchida.

### 3.7 Pedidos (detalhe em §5)

`Pedido`, `PedidoItem`, `PedidoConfig`, `PushSubscription`, `Bairro`, `ZonaEntrega`.

### 3.8 Outros

- `Evento`: `titulo, descricao, dataInicio, dataFim?, imagem?, local?, preco?, linkExterno?,
  comercioId`.
- `Tag` (palavras-chave, `@@unique([nome, comercioId])`), `Foto` (`url, alt, ordem`).
- `Subcategoria`: `nome, categoria, ativo, ordem`, `@@unique([nome, categoria])`, N:M com comércio.
- `PontoTuristico`: entidade independente do admin — `nome, slug @unique, descricao, categoria,
  fotos String[], endereço/lat/lng, dicas` + campos condicionais por categoria (`dificuldade`,
  `distanciaKm`, `duracaoMin` para trilha; `altitudeM` para mirante; `temPiscinaNatural`,
  `precisaGuia` para cachoeira; `periodo` para histórico) + `ativo`.
- `AnalyticsEvent`: `comercioId, tipo String, origem String?, meta Json?, visitorId String?,
  createdAt` — anônimo, sem PII, com índices `[comercioId, createdAt]` e
  `[comercioId, tipo, createdAt]`.
- `Session`: model existe no schema (herança do adapter), mas a sessão real é **JWT**, não banco.

---

## 4. Features implementadas (estado atual do código)

Tudo abaixo **existe e está em produção/branch atual**. Marcações de gating indicam o que
controla o acesso.

### 4.1 Público / visitante (sem login)

| Feature | Rota | Notas |
|---|---|---|
| Home | `/` | ISR `revalidate = 180`. Seções: categorias com contagem, **Em destaque** (`destaque_busca`), **Abertos agora** (calculado no servidor), **Eventos** (próximos 6), **Pontos turísticos** (6) |
| Vitrine do comércio | `/vitrine/[slug]` | fotos, cardápio em destaque, produtos/serviços em destaque, eventos, horários, localização (Google Maps), contato. Comércio não-`ATIVO` mostra banner de pré-visualização e recebe `noindex` |
| Vitrine de hospedagem | `/vitrine/[slug]` | branch por `categorias[0] === "HOSPEDAGEM"`: Sobre → Fotos → Comodidades → Acomodações (quartos, bottom sheet) → Políticas → Horários → Localização → Contato |
| Cardápio digital | `/vitrine/[slug]/cardapio` | tabs por categoria, busca, destaques, bottom sheet do item, carrinho quando pedido online ativo. Gate: feature `cardapio` |
| Catálogo | `/vitrine/[slug]/catalogo` | grid 2–3 colunas, tabs Produtos/Serviços, busca, agrupado por `CatalogoCategoria` + "Outros". Gate: feature `catalogo` |
| Checkout do pedido | `/vitrine/[slug]/cardapio/checkout` | `noindex`; redireciona ao cardápio se o pedido não estiver ativo |
| Acompanhamento do pedido | `/pedido/[token]` | timeline + polling 20s; fora do route group público (sem BottomNav/Footer) |
| Listagem geral | `/comercios` | paginação 12/página, filtros, "abertos primeiro" |
| Listagens por categoria | `/gastronomia`, `/hospedagem`, `/turismo`, `/servicos`, `/lojas`, `/entretenimento` | rotas estáticas (`generateStaticParams` + `dynamicParams = false`); `/comercios?categoria=X` redireciona 308 |
| Eventos da cidade | `/eventos` | ISR 1800s, agrupado por mês, badges HOJE / EM ANDAMENTO, JSON-LD `Event` |
| Pontos turísticos | `/pontos-turisticos` e `/pontos-turisticos/[slug]` | filtro por categoria, galeria, metadados por tipo, mapa, JSON-LD `TouristAttraction` |
| Página da cidade | `/sao-bento-do-sapucai` | ISR 3600s, topo de funil SEO, JSON-LD `TouristDestination` |
| Mapa interativo | `/mapa` | Google Maps, clustering, markers com logo em canvas, filtros, busca, "Perto de mim" (geolocalização), bottom sheet de comércio/ponto |
| Busca | `/busca` | **página provisória** — só ecoa a query e oferece navegação; o motor de IA não existe (§10.1) |
| Landing comercial | `/para-comerciantes` | venda do SaaS, marca AIRotas, demo animada da busca por IA |
| SEO técnico | `/sitemap.xml`, `/robots.txt` | sitemap com `revalidate = 3600`; `generateMetadata` + JSON-LD nas páginas de entidade |

### 4.2 Dashboard do comerciante (`/comerciante/dashboard`)

Server Component (`getDashboardComercioData()` em `src/lib/dashboard-comercio.ts`) →
`<DashboardTabs>`. Abas e seus gates:

| Aba | Gate |
|---|---|
| Informações | — (dados, endereço com CEP/ViaCEP/mapa, horários, logo) |
| Analytics | aberta para todos; **feature `analytics`** libera os gráficos (senão teaser borrado) |
| Fotos | limite `LIMITES_FREE.fotos = 3` sem `fotos_ilimitadas` |
| Hospedagem | **categoria** `HOSPEDAGEM` (perfil + tipos de quarto) |
| Cardápio | feature `cardapio` (categorias, itens, variações, drag-and-drop, fotos) |
| **Pedidos** | feature `pedido_online` (lista por status, config, zonas de entrega, push) |
| Produtos | catálogo `tipo=PRODUTO` |
| Serviços | catálogo `tipo=SERVICO` |
| Eventos | feature `eventos` |
| Palavras-chave | limite `LIMITES_FREE.tags = 5` no FREE |

### 4.3 Painel admin (`/admin`)

- **Comércios**: lista com filtros; criar comerciante+comércio; aprovar/rejeitar; tornar premium;
  **editar** (`/admin/comercios/[id]`, formulário completo com categorias e subcategorias — modo
  `adminMode`); **gerenciar painel completo** (`/admin/comercios/[id]/gerenciar`) — reusa o
  `DashboardTabs` do comerciante via o cookie `admin_comercio_id`.
- **Planos** (`/admin/planos`): CRUD, preço e checkboxes de features.
- **Subcategorias** (`/admin/subcategorias`): CRUD agrupado por categoria; exclusão bloqueada (409)
  se estiver em uso.
- **Usuários** (`/admin/usuarios`): CRUD; só `SUPER_ADMIN` mexe em ADMIN/SUPER_ADMIN.
- **Pontos turísticos** (`/admin/pontos-turisticos` + `[id]`): CRUD + fotos (máx. 8).
- **Bairros** (`/admin/bairros`): catálogo canônico de bairros/áreas de entrega (seed
  `db:seed:bairros` com SBS + Gonçalves/MG).
- **Eventos** (`/admin/eventos`): listagem read-only de todos os eventos da plataforma, separados em próximos e passados.

### 4.4 Analytics (implementado)

- **Coleta**: `VitrineTracker` (client invisível) monta nas páginas públicas do comércio **apenas
  quando `status === ATIVO`**; registra pageview com origem (dedupe por sessão) e captura cliques
  por delegação em `[data-track="<tipo>"]`. Envia por `sendBeacon` → `POST /api/track` (público,
  responde sempre **204**, filtra bots por user-agent).
- **Tipos de evento**: `view`, `click_whatsapp`, `click_ligar`, `click_instagram`, `click_site`,
  `click_rota`, `click_share`, `click_reserva`, `cardapio_view`, `catalogo_view`, `item_view`,
  `evento_view`, `galeria_view`.
- **Origens**: `home_destaque`, `home_abertos`, `home_eventos`, `eventos`, `listagem`, `mapa`,
  `busca`, `qr`, `google`, `direto` (links internos levam `?src=<origem>`).
- **Agregação**: `getAnalyticsResumo` (`src/lib/analytics/queries.ts`) roda 7 queries em paralelo
  (groupBy + `$queryRaw` para série diária, top itens via `meta->>'titulo'`, pico por dia/hora),
  em `America/Sao_Paulo`. **Sem rollup** — eventos brutos.
- **LGPD**: sem PII; `visitorId` é UUID de sessão do browser.

### 4.5 Notificações

**Web Push** para o comerciante (`src/lib/push.ts`, `public/sw-push.js`, model
`PushSubscription`, VAPID). Disparado no `POST /api/pedidos` após criar o pedido, dentro de
`try/catch` — **best-effort**, falha de push nunca invalida o pedido. Inscrições que retornam
404/410 são removidas. **Limitação iOS**: Web Push exige o site instalado como PWA; como não há
manifest/PWA, no iPhone vale só o polling com a aba aberta.

Não existe e-mail transacional, SMS nem WhatsApp automatizado em nenhum fluxo.

---

## 5. Módulo de pedidos online — como funciona hoje

Feature paga (`pedido_online`, dependente de `cardapio`), implementada como **Fase 1 / MVP**
(commit `3d32a7a`). **Sem integração com meios de pagamento** — o pagamento é combinado
presencialmente, na entrega ou retirada. Plano de referência: `docs/pedido-online.md`.

### 5.1 Gating — quando o botão de pedir aparece

Três condições, todas verificadas **no servidor**, tanto na renderização quanto no `POST`:

```
comercio.status === "ATIVO"
&& temFeature(plan.features, "pedido_online")
&& pedidoConfig.aceitaPedidos === true
```
Sem as três, o cardápio renderiza em modo somente leitura, exatamente como antes da feature.

### 5.2 Fluxo do cliente, passo a passo

1. **Cardápio** (`/vitrine/[slug]/cardapio`) — Server Component busca categorias/itens
   disponíveis e passa `pedidoAtivo` ao `CardapioView` (client).
2. **Adicionar ao carrinho** — o `ProdutoBottomSheet` recebe quantidade, variação (obrigatória
   quando o item tem variações) e observação livre.
3. **Carrinho** — `src/lib/carrinho.ts`, hook `useCarrinho(slug)`. **Estado 100 % client-side em
   `localStorage`**, chave `carrinho:<slug>`, **isolado por comércio** (nunca mistura lojas).
   Linhas com mesmo `produtoId|variacaoId` são mescladas (soma quantidade). **Nada é persistido no
   servidor antes do envio — não existe "carrinho" no banco.**
4. **Barra fixa** (`cart-bar.tsx`) → link para `/vitrine/[slug]/cardapio/checkout`.
5. **Checkout** (`checkout-form.tsx`, client) — a página server carrega `pedidoConfig`,
   `zonasEntrega` ativas e calcula `abertoAgora`. O formulário coleta:
   - tipo: **Entrega** ou **Retirada** (conforme `entregaAtiva`/`retiradaAtiva`);
   - nome + WhatsApp;
   - se entrega: CEP (ViaCEP), logradouro, número, complemento, referência e **bairro escolhido de
     um `select` das zonas da loja** (agrupado por cidade);
   - forma de pagamento (subconjunto de `FORMAS_PAGAMENTO`: `pix`, `dinheiro`, `credito`,
     `debito`, `transferencia`); se `dinheiro`, "troco para quanto?";
   - observações gerais.
   Resumo com subtotal + taxa + total.
6. **Envio** — `POST /api/pedidos` (rota **pública, sem auth**).
7. **Sucesso** — o client limpa o carrinho e faz `router.push('/pedido/<token>')`.
8. **Acompanhamento** — `/pedido/[token]`: timeline de status (passos diferem para entrega e
   retirada), dados do pedido, botão WhatsApp da loja e **Cancelar** enquanto `AGUARDANDO`.
   **Polling `GET /api/pedidos/[token]` a cada 20 s**, encerrado ao chegar a estado terminal.

### 5.3 O que o servidor faz no `POST /api/pedidos` (autoridade)

Ordem exata das validações em `src/app/api/pedidos/route.ts`:

1. Zod sobre o payload (`comercioId`, `tipoEntrega`, dados do cliente, `zonaId`, `formaPagamento`,
   `itens[]` com `produtoId`/`variacaoId`/`quantidade ≤ 99`/`observacao`; máx. 50 linhas).
2. Carrega o comércio; exige `status === ATIVO`, feature `pedido_online` (403) e
   `pedidoConfig.aceitaPedidos`.
3. Exige `entregaAtiva`/`retiradaAtiva` conforme o tipo.
4. **Horário**: `parseHorarios` + `estaAbertoAgora` — loja fechada agora ⇒ 400. **Fallback:**
   comércio **sem horário cadastrado não é bloqueado**.
5. Forma de pagamento tem de estar em `pedidoConfig.formasPagamento`.
6. Se entrega: exige logradouro + número e uma `ZonaEntrega` **ativa e da própria loja**; a
   **taxa e o nome do bairro vêm da zona no banco**, nunca do cliente ("Não entregamos nessa
   região" caso contrário).
7. **Recarrega os produtos do banco** com
   `where { id: in ids, comercioId, disponivel: true, categoriaCardapioId: { not: null } }` —
   ou seja: só itens do **cardápio**, **disponíveis**, **daquele comércio**. Item ausente ⇒
   "Um dos itens não está mais disponível".
8. Preço unitário: se o produto tem variações, exige `variacaoId` válido e usa `variacao.preco`;
   senão usa o **preço efetivo** (`precoPromo` se a promo estiver ativa, senão `preco`). Produto
   sem preço ⇒ erro.
9. `subtotal = Σ precoUnit × quantidade` (arredondado a 2 casas em `src/lib/pedidos.ts`);
   valida `pedidoMinimo` (só entrega); `total = subtotal + taxaEntrega`.
10. Se `dinheiro` e `trocoPara` informado, exige `trocoPara >= total`.
11. **Transação Prisma**: incrementa `PedidoConfig.proximoNumero` e cria o `Pedido` com
    `numero = proximoNumero - 1` (sequencial **por comércio**, com rede de segurança
    `@@unique([comercioId, numero])`) e os `PedidoItem` como **snapshot**.
12. Dispara **Web Push** para os dispositivos do comerciante em `try/catch`.
13. Responde **201** com `{ token, numero }`.

**Preço enviado pelo cliente é sempre ignorado.** O carrinho local só carrega ids e quantidades
para efeito prático.

### 5.4 Snapshot imutável

`PedidoItem` guarda `titulo`, `variacaoNome`, `precoUnit`, `quantidade`, `observacao` congelados;
`produtoId` é **referência fraca, sem FK** — o produto pode ser editado ou excluído depois sem
afetar pedidos passados. Da mesma forma, `Pedido.bairro` guarda o nome da zona como texto.

### 5.5 Máquina de estados

`src/lib/pedidos.ts` é a fonte única (usada pela API para validar e pela UI para habilitar botões):

```
AGUARDANDO   → ACEITO | RECUSADO | CANCELADO
ACEITO       → EM_PREPARO | CANCELADO
EM_PREPARO   → PRONTO | CANCELADO
PRONTO       → SAIU_ENTREGA (se ENTREGA) | CONCLUIDO (se RETIRADA) | CANCELADO
SAIU_ENTREGA → CONCLUIDO | CANCELADO
CONCLUIDO / RECUSADO / CANCELADO  = terminais
```
- Transição inválida ⇒ **409**. `RECUSADO`/`CANCELADO` pela loja exigem `motivoCancelamento`.
- **Cliente** só cancela em `AGUARDANDO` (`PATCH /api/pedidos/[token]` com `{ acao: "cancelar" }`).
- O agrupamento do painel é derivado: `novos` (AGUARDANDO), `andamento`, `encerrados`.

### 5.6 Estoque — **não existe**

Não há nenhum controle de estoque no projeto: nenhum campo de quantidade, nenhuma reserva,
nenhuma baixa ao concluir pedido, nenhuma trava de concorrência sobre itens. A única alavanca é o
booleano **`Produto.disponivel`**, alternado manualmente pelo comerciante. Consequências:

- dois clientes podem pedir o mesmo item "esgotado" simultaneamente — a loja resolve recusando;
- não há histórico de movimentação nem custo/margem;
- qualquer integração com ERP/PDV que exija estoque precisará de **novos campos/models** (o
  gancho natural é `Produto`, e o ponto de baixa seria a transição `ACEITO`/`CONCLUIDO`).

### 5.7 Entrega e taxas

- `Bairro` — catálogo canônico da cidade (e vizinhas), gerido pelo admin, populado por seed.
- `ZonaEntrega` — a área que **uma loja** atende, com **taxa própria**; aponta para o catálogo
  (`bairroId`) ou é custom da loja (`bairroId = null`). `nome`/`cidade`/`uf` são denormalizados.
- `PUT /api/comerciante/zonas-entrega` **substitui o conjunto inteiro** (deleteMany + createMany em
  transação) e, para zonas do catálogo, **reescreve nome/cidade/uf a partir do `Bairro`**
  (anti-tamper).
- Não há cálculo por raio/distância nem geocodificação do endereço do cliente (backlog §10.3).

### 5.8 Como o comerciante recebe e opera

- Aba **Pedidos** (`pedidos-manager.tsx`), filtro por grupo, cards com itens, cliente, endereço,
  pagamento, troco, total e tempo decorrido; botões seguem a máquina de estados.
- **Polling `GET /api/comerciante/pedidos` a cada 15 s** (`POLL_MS = 15000`) enquanto a aba está
  aberta: detecta pedidos novos, toca um **beep** e faz o **título da janela piscar**.
  A rota aceita `?desde=<ISO>` para busca incremental por `updatedAt` (limite de 200 registros).
- **Web Push** (§4.5) cobre o caso do navegador fechado, exceto iOS.
- **Configuração** (`pedido-config-form.tsx` → `PUT /api/comerciante/pedido-config`):
  `aceitaPedidos`, `entregaAtiva`, `retiradaAtiva`, `pedidoMinimo`, `tempoPreparoMin`,
  `formasPagamento[]`. **A taxa fixa saiu** — toda taxa passa pelas zonas.
- **Zonas de entrega** (`zonas-entrega-manager.tsx`): busca no catálogo de bairros, marca os
  atendidos + taxa, adiciona áreas custom.

### 5.9 Segurança e privacidade do pedido

- O **`token` (cuid) é a única credencial** de acesso ao pedido; não há login de cliente nem rota
  que liste pedidos publicamente.
- PII mínima: nome, WhatsApp e endereço (só em entrega). **Nenhum dado de pagamento é coletado.**
- `POST /api/pedidos` é público e **não tem rate limiting nem captcha** hoje.

---

## 6. Superfície de API (todas as rotas HTTP existentes)

Convenções: todas em `src/app/api/**/route.ts`; corpo JSON; validação Zod; erros no formato
`{ error: string, issues?: ZodIssue[] }`. **Não há versionamento (`/v1`), nem CORS configurado,
nem chave de API, nem webhooks de saída.** As rotas privadas dependem do **cookie de sessão**
do NextAuth.

### 6.1 Públicas (sem autenticação)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/pedidos` | **Cria pedido.** Body: `{ comercioId, tipoEntrega, clienteNome, clienteWhats, cep?, endereco?, numeroEnd?, complemento?, referencia?, zonaId?, formaPagamento, trocoPara?, observacoes?, itens: [{ produtoId, variacaoId?, quantidade, observacao? }] }` → **201** `{ token, numero }`. Validações em §5.3 |
| `GET` | `/api/pedidos/[token]` | Dados completos do pedido para acompanhamento (itens, valores, status, dados da loja). 404 se o token não existir |
| `PATCH` | `/api/pedidos/[token]` | Body `{ acao: "cancelar" }` — só em `AGUARDANDO`, senão **409** |
| `POST` | `/api/track` | Coleta de analytics (`sendBeacon`, `text/plain`). **Sempre 204**, ignora payload inválido, filtra bots |
| `GET` | `/api/subcategorias` | Subcategorias ativas (usada por formulários) |
| `*` | `/api/auth/[...nextauth]` | Handlers do NextAuth (login/logout/session/csrf) |

> **Não existe rota pública de leitura de comércios, cardápio, produtos ou eventos.** Todo o
> conteúdo público é renderizado por Server Components consultando o Prisma diretamente. Um
> integrador externo hoje **não tem como ler o catálogo por HTTP** — só o HTML/JSON-LD das páginas.

### 6.2 Comerciante — `/api/comerciante/*`

Guard único: `getComercioCtx()` (sessão `COMERCIANTE` própria **ou** `ADMIN`/`SUPER_ADMIN` com o
cookie `admin_comercio_id`). Sem contexto ⇒ **401**.

**Produtos / catálogo**

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/comerciante/produtos` | Todos os produtos do comércio (cardápio + catálogo), com `variacoes` e as duas categorias |
| `POST` | `/api/comerciante/produtos` | Cria. Campos: `tipo?, titulo, descricao?, preco?, imagens[≤3]?, disponivel?, destaque?, precoPromo?, promoFim?, categoriaCardapioId?, categoriaCatalogoId?, variacoes[]?`. Valida dono e (para catálogo) **mesmo tipo** da categoria |
| `PATCH` | `/api/comerciante/produtos/[id]` | Atualiza. Enviar `variacoes` **substitui todas** (transação); omitir preserva — usado nos toggles de disponibilidade |
| `DELETE` | `/api/comerciante/produtos/[id]` | Remove o produto **e apaga as imagens no Supabase Storage** |
| `POST` | `/api/comerciante/catalogo/categorias` | Cria categoria de catálogo (exige `tipo`) |
| `PATCH`/`DELETE` | `/api/comerciante/catalogo/categorias/[id]` | Renomeia / exclui (itens voltam para "Outros" via `SetNull`) |

**Cardápio**

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/comerciante/cardapio` | Categorias do cardápio com produtos e variações, ordenadas |
| `POST` | `/api/comerciante/cardapio/categorias` | Cria categoria |
| `PATCH`/`DELETE` | `/api/comerciante/cardapio/categorias/[id]` | Edita / exclui |
| `POST` | `/api/comerciante/cardapio/itens` | Cria item do cardápio (`categoriaId` → grava `categoriaCardapioId`) |
| `PATCH`/`DELETE` | `/api/comerciante/cardapio/itens/[id]` | Edita / exclui item |
| `PATCH` | `/api/comerciante/cardapio/ordem` | Reordena: `{ tipo: "categoria", ids }` ou `{ tipo: "item", categoriaId, ids }` |

> Os itens do cardápio são gravados no **mesmo model `Produto`**; `/cardapio/itens` e `/produtos`
> são duas portas para a mesma tabela, com validações diferentes.

**Pedidos**

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/comerciante/pedidos` | Lista (máx. 200, `createdAt desc`) com itens; `?desde=<ISO>` filtra por `updatedAt >` — usado pelo polling |
| `PATCH` | `/api/comerciante/pedidos/[id]` | Muda status: `{ status, motivoCancelamento? }`. Valida a máquina de estados (**409** em transição inválida) e exige motivo em `RECUSADO`/`CANCELADO` |
| `PUT` | `/api/comerciante/pedido-config` | Upsert da config de pedidos |
| `GET`/`PUT` | `/api/comerciante/zonas-entrega` | Lista / **substitui o conjunto** de zonas (bairro + taxa) |
| `POST`/`DELETE` | `/api/comerciante/push` | Registra / remove inscrição Web Push do aparelho |

**Perfil e conteúdo**

| Método | Rota | Descrição |
|---|---|---|
| `GET`/`PATCH` | `/api/comerciante/comercio` | Dados do próprio comércio |
| `POST` | `/api/comerciante/upload` | Upload de imagem (`multipart`, máx. 5 MB, `tipo` = `logo`\|`produto`\|`evento`\|`cardapio`\|`quarto`\| omitido para fotos). Aceita também ADMIN com `comercioId` no formData |
| `POST` | `/api/comerciante/fotos` · `DELETE /api/comerciante/fotos/[id]` | Galeria |
| `GET`/`POST` | `/api/comerciante/eventos` · `PATCH`/`DELETE` `/[id]` | Eventos |
| `GET`/`POST` | `/api/comerciante/tags` · `DELETE /[id]` | Palavras-chave |
| `PUT` | `/api/comerciante/hospedagem` | Upsert do perfil de hospedagem |
| `POST` | `/api/comerciante/hospedagem/quartos` · `PATCH`/`DELETE` `/[id]` | Tipos de quarto |

### 6.3 Admin — `/api/admin/*`

Guard: `auth()` + role `ADMIN`/`SUPER_ADMIN` no handler.

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/admin/comercios` | Cria comerciante + comércio (gera slug único) |
| `PATCH` | `/api/admin/comercios/[id]` | Edita tudo do comércio, inclusive `categorias` e `subcategoriaIds` (`set`), status, plano |
| `GET`/`POST` | `/api/admin/planos` · `PATCH`/`DELETE` `/[id]` | Planos e suas features |
| `GET`/`POST` | `/api/admin/subcategorias` · `PATCH`/`DELETE` `/[id]` | Exclusão bloqueada com **409** se em uso |
| `GET`/`POST` | `/api/admin/usuarios` · `PATCH`/`DELETE` `/[id]` | Só `SUPER_ADMIN` mexe em ADMIN/SUPER_ADMIN |
| `GET`/`POST` | `/api/admin/pontos-turisticos` · `PATCH`/`DELETE` `/[id]` | CRUD |
| `POST`/`DELETE` | `/api/admin/pontos-turisticos/[id]/fotos` | Upload (máx. 8) / remoção |
| `GET`/`POST` | `/api/admin/bairros` · `PATCH`/`DELETE` `/[id]` | Catálogo de bairros de entrega |

---

## 7. Documentação existente no repositório

| Arquivo | Assunto | Status do que descreve |
|---|---|---|
| `CLAUDE.md` (≈61 KB) | **Documento mestre.** Arquitetura, convenções, cada seção do produto, armadilhas de UI/SSR, decisões de design | Atualizado, é a fonte principal |
| `AGENTS.md` | Aviso: este Next.js tem breaking changes; ler `node_modules/next/dist/docs/` | — |
| `docs/pedido-online.md` | Plano completo do pedido online: decisões, modelo, máquina de estados, fluxos, taxa por bairro, faseamento | **Fase 1 implementada** (o cabeçalho ainda diz "não iniciada" — desatualizado); Fases 2/3 parciais |
| `docs/analytics.md` | Arquitetura de coleta, dashboard, agregação | **Implementado (V1)** |
| `docs/seo.md` | Plano de SEO em 4 fases | **Fases 1 e 2 implementadas**; parte da 3 feita; Fase 4 parcial |
| `docs/busca-inteligente.md` | Busca em linguagem natural: arquitetura híbrida, scoring, custos, decisões | **Só a UI de entrada existe**; motor não iniciado |
| `docs/multitenant.md` | Migração para plataforma multi-cidade (AIRotas) por subdomínio | **Não iniciado** (proibido antes da V1) |
| `DOCUMENTATION.md` | Doc técnica antiga | **Obsoleto** — não usar |
| `README.md` | Boilerplate do create-next-app | Sem valor |

---

## 8. Convenções e armadilhas do código (para quem for mexer)

1. **Nunca importar `@/lib/auth` no middleware** — puxa Prisma + bcryptjs e estoura o limite de
   1 MB do Edge. Idem para `@/lib/comercio-ctx`; o middleware só importa
   `@/lib/admin-comercio-cookie` (módulo sem imports).
2. **Toda rota nova em `/api/comerciante/*` deve usar `getComercioCtx()`** — nunca um guard local
   (senão o admin perde o painel de gestão).
3. **`heic2any` só por import dinâmico** (`await import("heic2any")`): ele cria um `Worker` no
   carregamento e quebra o SSR do build de produção (`next dev` não acusa; `next start` sim).
4. **Fuso**: qualquer cálculo de "aberto agora"/datas usa `Intl.DateTimeFormat` com
   `timeZone: "America/Sao_Paulo"`, no servidor.
5. **ISR obrigatório** em páginas cujo conteúdo muda com o tempo: home (`180`), eventos (`1800`),
   cidade (`3600`), sitemap (`3600`). Sem isso a página congela no build.
6. **Página pública nova** deve ter `generateMetadata` citando "São Bento do Sapucaí", entrar no
   `sitemap.ts` e, se for entidade, emitir JSON-LD via os builders de `src/lib/seo/jsonld.ts`.
7. **Link interno para vitrine** deve levar `?src=<origem>` (analytics); CTA server-side novo
   ganha `data-track="<tipo>"`.
8. **Regras já vigentes por causa do multitenant futuro**: fazer queries em Server Components,
   manter copy centralizável, e models "da cidade" nascerem preparados para um `cityId`.
9. **DDL sempre pelo `DIRECT_URL`** (porta 5432); o pooler trava schema.
10. Detalhes de UI com histórico de bug (bottom sheet no Safari iOS, scroll lock, carrossel,
    curvas/waves entre seções) estão documentados no `CLAUDE.md` — respeitar antes de "simplificar".

---

## 9. Limitações conhecidas do estado atual

- **Sem testes automatizados** (nenhum runner configurado). A verificação é manual, com a skill
  `verify` do repo (build de produção + login via REST + drive de páginas/APIs).
- **Sem estoque, sem pagamento online, sem emissão fiscal, sem impressão de comanda.**
- **Sem rate limiting / captcha** no `POST /api/pedidos` e no `POST /api/track`.
- **Sem webhooks de saída** e sem eventos de domínio publicados — a única notificação externa é o
  Web Push para os dispositivos do próprio comerciante.
- **Sem API pública de leitura** (nem read-only do catálogo).
- **Sem fila/retry**: o push é best-effort; nada é reprocessado.
- **Polling** é o mecanismo de tempo real (15 s no painel, 20 s no acompanhamento). Supabase
  Realtime foi avaliado e **descartado** (o projeto não usa o SDK Supabase nem expõe anon key).
- **Cookie `admin_comercio_id` guarda um único comércio-alvo** — o admin gerenciando dois
  comércios em abas paralelas faz os fetches da aba antiga atingirem o comércio mais recente
  (há banner avisando).
- **Web Push não funciona no iPhone** sem PWA instalado (restrição da Apple); PWA foi descartado
  por ora.
- Analytics sem rollup (eventos brutos) — barato na escala atual, revisar se crescer.

---

## 10. Backlog — o que está planejado e **não** implementado

### 10.1 Busca inteligente por IA (`docs/busca-inteligente.md`)

Maior diferencial comercial prometido na landing. **Hoje existe só a UI de entrada** (selo ✨,
placeholders rotativos no hero, chips de sugestão e a página provisória `/busca` que apenas ecoa
a query). O motor está **pausado** até o sistema ter mais conteúdo.

Arquitetura decidida (híbrida):
- **Fase 1 — semântico + boosts:** `pgvector` (embeddings) + full-text PT (`tsvector` com
  `setweight`) + boosts de negócio (premium como **desempate leve**, nunca override;
  aberto-agora priorizado). Indexação on-write de um `searchDoc` por comércio.
- **Fase 2 — LLM por cima:** **Claude Haiku 4.5** (`claude-haiku-4-5`) re-rankeia os ~15
  finalistas e gera a frase de resposta em linguagem natural.
- **Fase 3 — intenção + contexto:** extrair filtros da query ("aberto agora", "perto de mim",
  faixa de preço) e usar a geolocalização que o `/mapa` já capta.

**Serviços externos que isso implica:** **Voyage AI** `voyage-4` para embeddings (decisão fechada;
dimensão 512, `input_type` document/query; 200M tokens grátis; exige `VOYAGE_API_KEY`) e a
**API da Anthropic** para o re-rank. Ponto em aberto: confirmar a contagem real de comércios
ativos antes de começar.

### 10.2 Multitenant — AIRotas (`docs/multitenant.md`)

Transformar o guia em plataforma multi-cidade por **subdomínio**
(`guararema.airotas.com.br`). **Explicitamente proibido iniciar antes do lançamento da V1 em
São Bento.** Fases:

- **Fase 0 — fundação:** model `City` (slug/subdomínio, nome, uf, lat/lng, timezone, `branding
  Json`), `cityId` obrigatório em `Comercio` e `PontoTuristico` com uniques compostos, backfill,
  resolução de tenant no middleware por `host` + helper `getTenant()`, wildcard
  `*.airotas.com.br` na Vercel. `Bairro` também ganha `cityId`.
- **Fase 1 — scoping das queries** (o risco real): `where { cityId }` em ~28 call sites; preferir
  **Prisma Client Extension** que injeta o filtro automaticamente, para evitar vazamento entre
  tenants.
- **Fase 2 — branding dinâmico:** 26+ arquivos com copy de SBS passam a ler de `City.branding`;
  assets por cidade; SEO por subdomínio.
- **Fase 3 — operação multi-cidade:** admin por cidade, onboarding de cidade sem deploy, escopo do
  cookie de sessão, busca por IA filtrada por tenant.

Decisões em aberto: planos globais ou por cidade; subcategorias globais ou por cidade; sessão
cross-subdomínio; o que fica no domínio raiz; migração do domínio atual (301 vs alias).

### 10.3 Pedido online — Fases 2 e 3 (`docs/pedido-online.md`)

Já entregue da Fase 2: Web Push e bloqueio fora do horário e taxa por bairro. **Pendente:**

- **WhatsApp Business Cloud API para o CLIENTE** — confirmação automática do pedido no WhatsApp do
  comprador (número central da plataforma + templates aprovados, ~R$ 0,04/msg utility). É a
  integração externa mais explicitamente planejada do projeto. *(WhatsApp automático não é viável
  sem a API oficial.)* Alternativa grátis citada: **bot do Telegram** como canal extra de alerta
  para a loja.
- **Agendamento** ("pedir para mais tarde" quando a loja está fechada).
- **Taxa de entrega por raio/distância** (geocodificação), combinável com as zonas.
- **Fase 3 — pós-venda:** histórico/relatório de pedidos no dashboard, integração dos pedidos com
  a aba Analytics (eventos `pedido_iniciado`/`pedido_enviado`), "repetir pedido" para o cliente.

### 10.4 SEO — Fases 3 e 4 pendentes (`docs/seo.md`)

- **ISR nas vitrines, listagens e pontos turísticos** (hoje só home/eventos/cidade/sitemap têm).
- **Google Search Console**: submeter sitemap e acompanhar queries reais.
- **Interlinking sistemático** vitrine → categoria → pontos próximos.
- `aggregateRating` no JSON-LD quando houver avaliações.
- ~~Seção editorial `/guia/[slug]`~~ — **fora do escopo da V1** (decisão de 2026-06-11);
  se voltar, começar com MDX no repo.

### 10.5 Analytics — fase futura (`docs/analytics.md`)

Relatório mensal por e-mail/WhatsApp ("seu mês no AIRotas"), benchmark anônimo por categoria,
visão admin agregada da plataforma, termos de busca que levaram ao perfil (depende da busca por
IA), origem `qr` ligada de fato (depende do QR Code).

### 10.6 Itens soltos do roadmap (`CLAUDE.md`)

- **QR Code do perfil para impressão** — a feature flag `qr_code` já existe no plano, a
  implementação não; deve gerar link com `?src=qr`.
- **Avaliações de visitantes** (destrava `aggregateRating` no SEO).
- **Produto simultâneo no cardápio e no catálogo** (hoje são mutuamente exclusivos).
- **Filtro por raio no mapa** — UI removida temporariamente, a lógica de `raioKm` está preservada
  em `mapa-client.tsx`.
- **Rebrand global para AIRotas** — hoje só a landing usa a marca nova.

### 10.7 Não existe nem está planejado (perguntas frequentes de integração)

Pagamento online / PSP · split de pagamento · assinatura recorrente cobrada em gateway (os planos
são apenas registro no banco, sem billing) · nota fiscal · estoque · impressão de comanda/KDS ·
logística de entregadores · login de cliente final · app mobile / PWA instalável · e-mail
transacional · CRM · integração com iFood/Rappi/Goomer · marketplace multi-loja no checkout.

---

## 11. Notas para integrar este projeto com serviços externos

Resumo do que um integrador precisa saber, com base no código atual:

1. **Não há superfície de API para máquinas.** Toda rota privada exige cookie de sessão NextAuth
   (JWT, Credentials). Qualquer integração servidor-a-servidor precisará de algo novo: chave de
   API, um role de serviço, ou rotas dedicadas. Não existe CORS liberado nem OAuth.
2. **Não há webhooks de entrada nem de saída.** Um serviço externo que precise reagir a "pedido
   criado" ou "status mudou" teria que ser plugado em dois pontos bem definidos e já isolados:
   `POST /api/pedidos` (criação, onde hoje mora a chamada de push) e
   `PATCH /api/comerciante/pedidos/[id]` (transição de status).
3. **O ponto de extensão de notificação já existe** e é o molde natural para WhatsApp/Telegram/
   e-mail: `src/lib/push.ts` (`enviarPush`, `payloadNovoPedido`), chamado em `try/catch`
   best-effort. Qualquer canal novo deveria seguir a mesma regra: **falhar sem invalidar o pedido**.
4. **Catálogo para sincronizar com ERP/PDV/marketplace**: a tabela é `produtos` (§3.5), com
   `Produto.imagens String[]` e `CardapioVariacao` para preços múltiplos. Falta o que um ERP
   normalmente exige: **SKU/código externo, estoque, unidade, NCM, custo**. Um campo
   `externalId`/`sku` em `Produto` (e um em `Comercio`) seria o primeiro passo de qualquer
   sincronização bidirecional.
5. **Idempotência**: não há chave de idempotência em nenhuma rota. `Pedido.numero` é sequencial por
   comércio (transação + unique) e `Pedido.token` é único — servem como identificadores estáveis
   para o lado externo.
6. **Pagamento**: nada existe. Introduzir um PSP significaria novos estados entre `AGUARDANDO` e
   `ACEITO` na máquina de `src/lib/pedidos.ts`, que é hoje a única fonte de verdade das transições
   (usada simultaneamente pela API e pela UI).
7. **Storage**: as imagens já estão no Supabase Storage com URL pública estável; qualquer serviço
   externo consome direto por URL, sem assinatura.
8. **Multitenant iminente**: qualquer identificador ou chave externa criada agora deve prever um
   `cityId` (ver §10.2), sob pena de retrabalho.
9. **Deploy é Vercel serverless**: sem processo de longa duração, sem cron configurado, sem
   background worker. Integração que exija polling contínuo ou fila precisa de infra nova
   (Vercel Cron, QStash, ou serviço externo).
