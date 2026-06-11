# Multitenant — AIRotas (plano futuro)

> **Status:** planejado, **não iniciar antes do lançamento da V1 em São Bento do Sapucaí**
> (decisão de 2026-06-11). Este documento captura a auditoria e o plano completos para quando
> a migração for priorizada — e as regras de convivência para o desenvolvimento da V1 não
> encarecer a migração futura.
> **Última atualização:** 2026-06-11
> Documento vivo — atualizar conforme decisões forem fechadas e fases concluídas.

## Visão

Transformar o Guia SBS no **AIRotas**: a mesma plataforma servindo múltiplas cidades, uma por
subdomínio — `saobentodosapucai.airotas.com.br`, `guararema.airotas.com.br`, etc. O domínio
raiz (`airotas.com.br`) vira site institucional/lista de cidades. São Bento do Sapucaí é o
primeiro tenant e a V1 lança single-tenant.

> **Nota (2026-06-11):** a LP `/para-comerciantes` já usa a marca "AIRotas — São Bento do
> Sapucaí" (e cita `airotas.com.br/vitrine/...`). O restante do site segue "Guia SBS" até o
> rebrand global da Fase 2.

**Viabilidade (auditoria de 2026-06-11):** totalmente viável com a estrutura atual — nada na
arquitetura bloqueia. Complexidade média: o trabalho é volumoso e mecânico, não rearquitetura.
O que joga a favor: queries centralizadas nos Server Components, `Plan` configurável via DB,
slugs/storage/auth keyed por IDs globais, e a Vercel suporta wildcard domain
(`*.airotas.com.br`) nativamente.

---

## Auditoria — o que existe hoje (números de 2026-06-11)

| Item | Estado atual | Impacto na migração |
|---|---|---|
| Entidade de cidade | ❌ não existe | criar model `City` |
| `Comercio.slug` | `@unique` **global** | vira `@@unique([slug, cityId])` |
| `PontoTuristico.slug` | `@unique` **global** | vira `@@unique([slug, cityId])` |
| `Subcategoria` | `@@unique([nome, categoria])` global | decidir: global ou por cidade |
| Queries públicas/admin sem escopo | **~28 call sites** (`findMany`/`count`/`groupBy`/`$queryRaw` em home, /comercios, /mapa, /pontos-turisticos, vitrine, admin) | todas precisam de `where: { cityId }` |
| Branding/copy hardcoded | **26 arquivos** citam "São Bento do Sapucaí"/"Guia SBS"/"SBS" | virar config do tenant |
| Centro do mapa | `SBS_CENTER = { lat: -22.6989, lng: -45.7281 }` em `mapa-client.tsx` | vira `city.lat/lng` |
| Timezone | `America/Sao_Paulo` hardcoded (`horarios.ts`, home, vitrine) | ok até entrar cidade fora do fuso de Brasília → campo `City.timezone` |
| Fotos de `/assets` (hero, categorias) | fixas de SBS | assets por cidade (pasta por slug ou URLs no banco) |
| Roles | `ADMIN` é global | admin por cidade (adiável se a operação for centralizada) |
| Storage Supabase | paths keyed por `userId` (globalmente únicos) | sem mudança obrigatória |
| Middleware | só auth de `/admin` e `/comerciante` | ponto exato para resolver subdomínio |
| Cookie de sessão | host atual | decidir escopo (`domain=.airotas.com.br` ou por subdomínio) |

---

## Plano de migração (fases)

### Fase 0 — Fundação (1 sessão de trabalho)

1. **Model `City`:**
   ```prisma
   model City {
     id        String  @id @default(cuid())
     slug      String  @unique   // subdomínio: "saobentodosapucai", "guararema"
     nome      String            // "São Bento do Sapucaí"
     uf        String            // "SP"
     lat       Float             // centro do mapa
     lng       Float
     timezone  String  @default("America/Sao_Paulo")
     branding  Json    @default("{}")  // displayName, tagline, placeholders da busca, etc.
     ativo     Boolean @default(true)
     // relações: comercios, pontosTuristicos, (users?, subcategorias?)
   }
   ```
2. **`cityId` obrigatório** em `Comercio` e `PontoTuristico`; uniques compostos
   `@@unique([slug, cityId])`.
3. **Migração de backfill:** cria a cidade SBS e atribui todos os registros existentes a ela.
4. **Resolução de tenant:** middleware lê o `host`, extrai o subdomínio e injeta header
   `x-tenant`; helper central `getTenant()` (server-only, cacheado por request) resolve a
   `City` e é a **única** porta de entrada para saber a cidade corrente. Em dev,
   `sbs.localhost:3000` funciona direto no browser.
5. **Domínio:** wildcard `*.airotas.com.br` na Vercel; domínio atual do guia vira alias/redirect
   do tenant SBS.

### Fase 1 — Scoping das queries (2–3 sessões; o risco real do projeto)

- Adicionar `where: { cityId }` em **todos** os ~28 call sites públicos e admin (o número terá
  crescido — re-auditar com `grep -rn "findMany\|groupBy\|\$queryRaw"`).
- O perigo nº 1 do multitenancy é **vazamento entre tenants** (query sem filtro mostra dado de
  uma cidade na outra). Mitigações, em ordem de preferência:
  1. **Prisma Client Extension** que injeta `cityId` automaticamente nos models tenantizados
     (à prova de esquecimento);
  2. ou helper obrigatório (`scopedPrisma(cityId)`) + convenção forte no CLAUDE.md + revisão.
- APIs do comerciante já são escopadas por `ownerId` → herdam a cidade do comércio (sem
  mudança). APIs admin precisam do filtro.
- Slug lookup da vitrine vira `findUnique({ where: { slug_cityId: { slug, cityId } } })`.

### Fase 2 — Branding dinâmico (1–2 sessões, braçal)

- Os 26+ arquivos com copy de SBS passam a ler do `City.branding`/campos: titles e metadata,
  hero da home, placeholders da busca (manter o sabor local por cidade — "truta e pinhão" é de
  SBS; Guararema terá os dela), landing `/para-comerciantes`, footer.
- `SBS_CENTER` do mapa → `city.lat/lng` (prop do server pro client).
- Assets por cidade: `/public/assets/{citySlug}/...` ou URLs no banco (preferir banco — admin
  troca sem deploy).
- SEO (ver `docs/seo.md`): `metadataBase`, sitemap e JSON-LD passam a ser **por subdomínio**;
  o plano de SEO já nasce compatível, só parametrizar a cidade.

### Fase 3 — Operação multi-cidade (quando a 2ª cidade for real)

- **Admin por cidade:** `cityId` no `User` (ou tabela de membership se um admin puder gerenciar
  várias). `SUPER_ADMIN` continua global cross-cidades. Scoping nas APIs e páginas do admin.
- **Onboarding de cidade:** painel SUPER_ADMIN para criar cidade (slug, coords, branding,
  assets) sem deploy.
- **Cookie de sessão:** decidir escopo (ver decisões abaixo).
- **Busca por IA** (`docs/busca-inteligente.md`): índice/`searchDoc` ganham `cityId`; a busca
  filtra pelo tenant. A arquitetura planejada não muda.

---

## Decisões em aberto (fechar antes da Fase 0)

1. **Planos: globais ou por cidade?** Recomendação: **globais** (mesma tabela de preço em todas
   as cidades) — simplifica billing e o admin. Por cidade só se o mercado exigir preço regional.
2. **Subcategorias: globais ou por cidade?** Recomendação: **globais** (taxonomia compartilhada
   "Pizzaria", "Pousada" serve qualquer cidade) — evita curadoria duplicada. Reavaliar se uma
   cidade precisar de termos muito locais.
3. **Sessão de login cross-subdomínio?** Comerciante de SBS não precisa logar em Guararema →
   cookie por subdomínio é mais simples e mais seguro. Cookie compartilhado
   (`domain=.airotas.com.br`) só se houver usuários multi-cidade.
4. **Domínio raiz `airotas.com.br`:** site institucional do produto (vender para prefeituras/
   associações?) ou só um seletor de cidades? Define o escopo da Fase 3.
5. **Migração do domínio atual do guia** (qual é o domínio de produção da V1?): redirect 301
   para o subdomínio ou alias permanente. Impacta SEO — coordenar com `docs/seo.md`.

---

## Regras para a V1 (vigentes desde já)

Para a migração futura não encarecer a cada feature nova:

1. **Queries novas continuam nos Server Components/route handlers** (nunca espalhadas em
   client) — é o que mantém o scoping futuro localizado.
2. **Copy nova com nome da cidade/marca:** preferir constantes num módulo central quando for
   barato (em vez de string inline) — cada string inline nova é +1 item na Fase 2.
3. **Coordenadas/timezone:** qualquer código novo que precise do centro da cidade ou fuso deve
   reusar as constantes existentes (`SBS_CENTER`, `America/Sao_Paulo`), não criar cópias novas.
4. **Features novas com dados por comércio** (analytics, avaliações, QR) já nascem penduradas
   em `Comercio` → herdam a cidade de graça. Features com dados "da cidade" (eventos da cidade,
   artigos do `/guia` do plano de SEO) devem nascer **já com `cityId`** no model — custo zero
   agora, economia real depois.
5. **Re-auditar antes de começar a Fase 0:** os números desta auditoria (28 queries, 26
   arquivos) crescem com o desenvolvimento da V1 — refazer os greps.

---

## Sinergias com o restante do roadmap

- **SEO** (`docs/seo.md`): sitemap/metadata/JSON-LD por subdomínio; a decisão nº 5 (domínio)
  deve ser tomada em conjunto.
- **Busca por IA** (`docs/busca-inteligente.md`): índice ganha `cityId`; nada mais muda.
- **Artigos `/guia` e página "Sobre a cidade"** (SEO Fase 3): nascer com `cityId` desde o
  primeiro model (regra 4 acima).
