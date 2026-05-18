# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Projeto

**Guia SBS** — o melhor guia digital da cidade de São Bento do Sapucaí, SP (cidade turística na Serra da Mantiqueira). A visão é ser uma plataforma completa: comércios locais com perfis ricos, eventos da cidade, mapa interativo, busca, e muito mais.

Dois públicos principais:
- **Comerciante:** gerencia seu próprio perfil (informações, fotos, produtos, eventos, palavras-chave) via dashboard privado.
- **Visitante/turista:** consulta o guia público sem login — comércios, eventos, mapa.

Administradores aprovam e gerenciam os comércios. Os perfis públicos ficam em `/comercios/[id]`.

**Modelo de negócio:** SaaS B2B local — comerciantes pagam planos (FREE / PREMIUM) para acessar recursos da plataforma. A diferenciação de features entre os planos é estratégica e ainda está sendo definida. Ao implementar novas features, considerar se faz sentido restringi-las ao plano PREMIUM.

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
DATABASE_URL="postgresql://..."   # porta 5432 direta — NÃO use o pooler (causa "Tenant not found")
DIRECT_URL="postgresql://..."     # igual ao DATABASE_URL neste setup
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

`/comerciante/dashboard/page.tsx` é um Server Component que busca o comércio completo (com fotos, tags, produtos, eventos) e passa para `<DashboardTabs>` (Client Component). As abas são: Informações, Fotos, Produtos e serviços, Eventos, Palavras-chave.

### Perfil público

`/comercios/[id]/page.tsx` — Server Component público. Exibe todos os dados do comércio. Comércios com `status !== ATIVO` mostram um banner de pré-visualização mas não bloqueiam o acesso (útil para o comerciante revisar antes da aprovação).

### Upload de imagens

Rota única `/api/comerciante/upload` com parâmetro `tipo` (`logo`, `produto`, `evento`, ou omitido para fotos). O storage usa a `SERVICE_ROLE_KEY` diretamente via fetch REST (sem SDK Supabase). Estrutura de paths no bucket `comercios`:

```
{userId}/logo.{ext}
{userId}/fotos/{timestamp}.{ext}
{userId}/produtos/{timestamp}.{ext}
{userId}/eventos/{timestamp}.{ext}
```

### Mapas (Leaflet)

Leaflet exige importação com `next/dynamic` + `ssr: false`. O padrão adotado é ter um wrapper `*-dynamic.tsx` (Client Component) que faz o dynamic import do componente real. Nunca importe componentes Leaflet diretamente em Server Components.

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

Entidades principais: `User` → `Comercio` (1:1) → `Tag[]`, `Foto[]`, `Produto[]`, `Evento[]`. Todas as relações têm `onDelete: Cascade`. IDs gerados com `cuid()`.

Enums:
- `Role`: SUPER_ADMIN | ADMIN | COMERCIANTE
- `PlanType`: FREE | PREMIUM
- `ComercioStatus`: PENDENTE | ATIVO | INATIVO | REJEITADO
- `Categoria`: RESTAURANTE | HOSPEDAGEM | TURISMO | SERVICO | COMERCIO | ENTRETENIMENTO

## Fontes

- Serif: `Fraunces` (variável `--font-serif`)
- Sans: `Plus Jakarta Sans` (variável `--font-sans`)

## Próximas features planejadas

- Busca full-text (PostgreSQL `tsvector` com dicionário português)
- Página pública de listagem de comércios por categoria
- Página pública de eventos da cidade (`/eventos`)
- Avaliações de visitantes
- Analytics para comerciantes (visualizações, cliques)
- Promoções/ofertas com validade
- QR Code do perfil para impressão
- Diferenciação de features entre plano FREE e PREMIUM
