# Guia SBS — Documentação Técnica

Diretório comercial digital de São Bento do Sapucaí, SP. Permite que administradores gerenciem comerciantes e que cada comerciante administre seu próprio perfil público com informações, fotos, produtos, eventos e palavras-chave.

---

## Stack

| Camada       | Tecnologia                                        |
| ------------ | ------------------------------------------------- |
| Framework    | Next.js 16.2.4 (App Router)                       |
| Linguagem    | TypeScript 5                                      |
| UI           | Tailwind CSS 4 + shadcn/ui + @base-ui/react       |
| ORM          | Prisma 6                                          |
| Banco        | PostgreSQL via Supabase                           |
| Autenticação | NextAuth v5 (JWT + Credentials)                   |
| Storage      | Supabase Storage (REST API)                       |
| Mapas        | Leaflet 1.9.4 (dynamic import, SSR desativado)    |
| Geocoding    | Nominatim / OpenStreetMap (gratuito, sem API key) |
| CEP          | ViaCEP (gratuito, sem API key)                    |
| Validação    | Zod                                               |
| Datas        | date-fns com locale ptBR                          |
| Toasts       | Sonner                                            |

---

## Variáveis de Ambiente

Arquivo `.env` na raiz do projeto:

```env
# Conexão com o banco (Supabase PostgreSQL — porta direta 5432)
DATABASE_URL="postgresql://postgres:<SENHA>@db.<PROJECT-REF>.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:<SENHA>@db.<PROJECT-REF>.supabase.co:5432/postgres"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://<PROJECT-REF>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<gere com: openssl rand -base64 32>"
```

> **Atenção:** Use a porta `5432` (conexão direta), não o pooler padrão do Supabase. O pooler causa erro "Tenant not found" com a configuração atual.

---

## Comandos

```bash
npm run dev          # inicia o servidor de desenvolvimento
npm run build        # build de produção
npm run start        # inicia em modo produção
npm run db:push      # sincroniza schema Prisma com o banco
npm run db:seed      # popula o banco com dados iniciais (admin padrão)
npm run db:migrate   # cria migration Prisma (desenvolvimento)
```

**Credenciais do seed:**

- E-mail: `admin@guiasbs.com.br`
- Senha: `admin123`

---

## Estrutura de Arquivos

```
src/
├── app/
│   ├── admin/
│   │   ├── login/page.tsx              # Página de login (admins e comerciantes)
│   │   ├── layout.tsx                  # Layout base do admin (sem sidebar)
│   │   └── (painel)/
│   │       ├── layout.tsx              # Layout com sidebar (requer sessão admin)
│   │       ├── dashboard/page.tsx      # Dashboard do admin
│   │       ├── comercios/page.tsx      # Listagem e gestão de comércios
│   │       ├── usuarios/page.tsx       # Listagem e gestão de usuários
│   │       └── eventos/page.tsx        # Listagem de todos os eventos
│   ├── comerciante/
│   │   ├── layout.tsx                  # Proteção de rota para comerciantes
│   │   └── dashboard/page.tsx          # Dashboard do comerciante (abas)
│   ├── comercios/
│   │   └── [id]/page.tsx               # Perfil público de um comércio
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts # Handler NextAuth
│   │   ├── admin/
│   │   │   ├── comercios/route.ts      # POST criar comércio
│   │   │   ├── comercios/[id]/route.ts # PATCH status/plano
│   │   │   ├── usuarios/route.ts       # GET listar, POST criar
│   │   │   └── usuarios/[id]/route.ts  # PATCH editar, DELETE excluir
│   │   └── comerciante/
│   │       ├── comercio/route.ts       # GET dados, PATCH atualizar
│   │       ├── upload/route.ts         # POST upload de imagem
│   │       ├── fotos/route.ts          # POST registrar foto
│   │       ├── fotos/[id]/route.ts     # DELETE remover foto
│   │       ├── produtos/route.ts       # GET listar, POST criar
│   │       ├── produtos/[id]/route.ts  # PATCH editar, DELETE excluir
│   │       ├── eventos/route.ts        # GET listar, POST criar
│   │       ├── eventos/[id]/route.ts   # PATCH editar, DELETE excluir
│   │       ├── tags/route.ts           # GET listar, POST criar
│   │       └── tags/[id]/route.ts      # DELETE remover
│   ├── globals.css
│   └── layout.tsx                      # Layout raiz (fontes, providers)
├── components/
│   ├── admin/
│   │   ├── sidebar.tsx                 # Navegação lateral do painel admin
│   │   ├── criar-usuario-dialog.tsx    # Dialog de criação de usuário
│   │   ├── criar-comercio-dialog.tsx   # Dialog de criação de comércio
│   │   ├── usuarios-actions.tsx        # Ações por usuário (editar, ativar, excluir)
│   │   └── comercios-actions.tsx       # Ações por comércio (status, plano)
│   ├── comerciante/
│   │   ├── dashboard-tabs.tsx          # Container de abas do dashboard
│   │   ├── editar-comercio-form.tsx    # Formulário de dados gerais
│   │   ├── logo-uploader.tsx           # Upload do logo
│   │   ├── fotos-uploader.tsx          # Upload e reordenação de fotos
│   │   ├── endereco-input.tsx          # CEP + campos + mapa integrado
│   │   ├── mapa-picker.tsx             # Leaflet com pin arrastável
│   │   ├── horarios-editor.tsx         # Editor de horários por dia da semana
│   │   ├── produtos-manager.tsx        # CRUD de produtos/serviços
│   │   ├── eventos-manager.tsx         # CRUD de eventos
│   │   └── tags-editor.tsx             # Editor de palavras-chave (chips)
│   ├── public/
│   │   ├── mapa-view.tsx               # Leaflet read-only (perfil público)
│   │   └── mapa-view-dynamic.tsx       # Wrapper client com ssr:false
│   └── ui/                             # Componentes shadcn/ui
│       └── avatar, badge, button, card, dialog, dropdown-menu,
│           input, label, select, separator, sonner, table
├── lib/
│   ├── auth.ts                         # Configuração NextAuth
│   ├── prisma.ts                       # Singleton PrismaClient
│   ├── supabase-storage.ts             # uploadFile / deleteFile
│   └── utils.ts                        # cn() — merge de classes Tailwind
├── types/
│   └── next-auth.d.ts                  # Extensão de tipos da Session
└── middleware.ts                       # Proteção de rotas por role
```

---

## Banco de Dados

### Diagrama de entidades

```
User ─────────────── Comercio
 (1)                    (1)
                          │
          ┌───────────────┼───────────────┐──────────┐
          │               │               │          │
        Tag[]           Foto[]        Produto[]  Evento[]
```

### Models

#### User

| Campo    | Tipo            | Descrição                           |
| -------- | --------------- | ----------------------------------- |
| id       | String (cuid)   | PK                                  |
| name     | String          | Nome completo                       |
| email    | String (unique) | E-mail de login                     |
| password | String          | Hash bcrypt                         |
| role     | Role            | SUPER_ADMIN \| ADMIN \| COMERCIANTE |
| active   | Boolean         | Conta ativa/inativa                 |

#### Comercio

| Campo                                         | Tipo            | Descrição                                 |
| --------------------------------------------- | --------------- | ----------------------------------------- |
| id                                            | String (cuid)   | PK                                        |
| nome                                          | String          | Nome do estabelecimento                   |
| descricao                                     | String?         | Texto longo                               |
| categoria                                     | Categoria       | Enum de categoria                         |
| status                                        | ComercioStatus  | PENDENTE \| ATIVO \| INATIVO \| REJEITADO |
| plano                                         | PlanType        | FREE \| PREMIUM                           |
| cep, endereco, numero, bairro, cidade, estado | String?         | Endereço                                  |
| lat, lng                                      | Float?          | Coordenadas (pin do mapa)                 |
| telefone, whatsapp, email, website, instagram | String?         | Contato                                   |
| horarios                                      | String?         | JSON com horários por dia                 |
| logo                                          | String?         | URL Supabase Storage                      |
| ownerId                                       | String (unique) | FK → User                                 |

#### Produto

| Campo      | Tipo    | Descrição                     |
| ---------- | ------- | ----------------------------- |
| titulo     | String  | Nome do produto (obrigatório) |
| descricao  | String? | Detalhes                      |
| preco      | Float?  | null = preço não informado    |
| imagem     | String? | URL Supabase Storage          |
| disponivel | Boolean | Visível no perfil público     |
| ordem      | Int     | Ordenação na listagem         |

#### Evento

| Campo       | Tipo      | Descrição                          |
| ----------- | --------- | ---------------------------------- |
| titulo      | String    | Nome do evento (obrigatório)       |
| descricao   | String?   | Descrição longa                    |
| dataInicio  | DateTime  | Obrigatório                        |
| dataFim     | DateTime? | Opcional                           |
| imagem      | String?   | Banner — URL Supabase Storage      |
| local       | String?   | Endereço/local do evento           |
| preco       | Float?    | null = gratuito                    |
| linkExterno | String?   | Link de inscrição, ingressos, etc. |

#### Tag

| Campo      | Tipo   | Descrição                             |
| ---------- | ------ | ------------------------------------- |
| nome       | String | Palavra-chave (normalizada lowercase) |
| comercioId | String | FK → Comercio                         |
| —          | —      | Unique: [nome, comercioId]            |

#### Foto

| Campo | Tipo    | Descrição                    |
| ----- | ------- | ---------------------------- |
| url   | String  | URL pública Supabase Storage |
| alt   | String? | Texto alternativo            |
| ordem | Int     | Ordem na galeria             |

### Enums

```
Role:           SUPER_ADMIN | ADMIN | COMERCIANTE
PlanType:       FREE | PREMIUM
ComercioStatus: PENDENTE | ATIVO | INATIVO | REJEITADO
Categoria:      RESTAURANTE | HOSPEDAGEM | TURISMO | SERVICO | COMERCIO | ENTRETENIMENTO
```

---

## Autenticação e Controle de Acesso

### Fluxo de login

1. Usuário submete email + senha em `/admin/login`
2. NextAuth valida contra o banco com bcrypt
3. Se válido e `active = true`, cria JWT com `id` e `role`
4. Middleware redireciona conforme o role:
   - `ADMIN` / `SUPER_ADMIN` → `/admin/dashboard`
   - `COMERCIANTE` → `/comerciante/dashboard`

### Proteção de rotas (middleware.ts)

| Rota              | Acesso permitido                                   |
| ----------------- | -------------------------------------------------- |
| `/admin/*`        | SUPER_ADMIN, ADMIN                                 |
| `/comerciante/*`  | COMERCIANTE                                        |
| `/comercios/[id]` | Público                                            |
| `/admin/login`    | Não autenticados (autenticados são redirecionados) |

### Permissões por role

| Ação                             | COMERCIANTE | ADMIN | SUPER_ADMIN |
| -------------------------------- | :---------: | :---: | :---------: |
| Editar próprio comércio          |      ✓      |   —   |      —      |
| Gerenciar produtos/eventos/tags  |      ✓      |   —   |      —      |
| Ver todos os comércios           |      —      |   ✓   |      ✓      |
| Alterar status/plano do comércio |      —      |   ✓   |      ✓      |
| Criar usuário COMERCIANTE        |      —      |   ✓   |      ✓      |
| Criar usuário ADMIN/SUPER_ADMIN  |      —      |   ✗   |      ✓      |
| Editar usuário ADMIN/SUPER_ADMIN |      —      |   ✗   |      ✓      |
| Excluir usuários                 |      —      |   ✗   |      ✓      |

---

## Storage de Imagens (Supabase)

**Bucket:** `comercios` (público)

**Estrutura de paths:**

```
{userId}/logo.{ext}                    # Logo do comércio
{userId}/fotos/{timestamp}.{ext}       # Fotos do comércio
{userId}/produtos/{timestamp}.{ext}    # Imagens de produtos
{userId}/eventos/{timestamp}.{ext}     # Banners de eventos
```

**Restrições de upload:**

- Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Tamanho máximo: 5 MB por arquivo

**Funções disponíveis em `src/lib/supabase-storage.ts`:**

- `uploadFile(path, file)` — faz upload e retorna a URL pública
- `deleteFile(path)` — remove o arquivo do bucket

> O upload usa a `SUPABASE_SERVICE_ROLE_KEY` com o header `x-upsert: true` (sobrescreve se existir).

---

## Geocoding e Mapas

### Fluxo de coordenadas

1. Comerciante digita o CEP → ViaCEP preenche endereço, bairro, cidade, UF
2. Nominatim geocodifica a cidade para centralizar o mapa
3. Comerciante arrasta o pin para a posição exata do estabelecimento
4. As coordenadas `lat` e `lng` são salvas no PATCH do comércio

### Componentes de mapa

- `MapaPicker` — mapa editável com pin arrastável (usado no dashboard do comerciante)
- `MapaView` / `MapaViewDynamic` — mapa read-only com popup (usado no perfil público)

> Ambos usam Leaflet com CSS injetado dinamicamente e importação via `next/dynamic` com `ssr: false` para evitar erros de SSR. `MapaViewDynamic` é o wrapper "use client" necessário porque `ssr: false` só funciona em Client Components nesta versão do Next.js.

### Horários de funcionamento

Armazenados como JSON no campo `horarios` do comércio:

```json
[
  { "dia": "Segunda", "aberto": true,  "inicio": "08:00", "fim": "18:00" },
  { "dia": "Terça",   "aberto": true,  "inicio": "08:00", "fim": "18:00" },
  ...
  { "dia": "Domingo", "aberto": false, "inicio": "08:00", "fim": "18:00" }
]
```

---

## Painel Administrativo

**URL:** `/admin`  
**Acesso:** ADMIN e SUPER_ADMIN

### Páginas

| Rota               | Descrição                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `/admin/dashboard` | Visão geral (em desenvolvimento)                                                             |
| `/admin/comercios` | Tabela de comércios com filtro por status; ações: aprovar, inativar, rejeitar, alterar plano |
| `/admin/usuarios`  | Tabela de usuários; ações: criar, editar, ativar/desativar, excluir (SUPER_ADMIN)            |
| `/admin/eventos`   | Tabela de todos os eventos cadastrados por todos os comércios                                |

---

## Dashboard do Comerciante

**URL:** `/comerciante/dashboard`  
**Acesso:** COMERCIANTE (com comércio vinculado)

### Abas

| Aba                 | Componente                            | Descrição                                              |
| ------------------- | ------------------------------------- | ------------------------------------------------------ |
| Informações         | `EditarComercioForm` + `LogoUploader` | Dados gerais, contato, endereço + mapa, horários, logo |
| Fotos               | `FotosUploader`                       | Upload e reordenação da galeria de fotos               |
| Produtos e serviços | `ProdutosManager`                     | CRUD com imagem, preço BRL, disponibilidade            |
| Eventos             | `EventosManager`                      | CRUD com banner, datas, local, ingresso, link externo  |
| Palavras-chave      | `TagsEditor`                          | Chips de palavras-chave para busca                     |

---

## Perfil Público do Comércio

**URL:** `/comercios/[id]`  
**Acesso:** Público

Exibe:

- Banner (primeira foto como capa)
- Logo, nome, categoria, badge Premium
- Status aberto/fechado baseado no horário atual
- CTAs rápidos: WhatsApp, Ligar, Como chegar, Site, Instagram
- Descrição
- Galeria de fotos (scroll horizontal)
- Horários de funcionamento (dia atual destacado)
- Mapa interativo
- Lista de contatos

> Comércios não publicados (status ≠ ATIVO) exibem um banner de aviso de pré-visualização.

---

## Próximas Features Planejadas

- [ ] Sistema de busca full-text (PostgreSQL `tsvector` com dicionário português)
- [ ] Página pública de listagem de comércios por categoria
- [ ] Página pública de eventos da cidade (`/eventos`)
- [ ] Avaliações de visitantes
- [ ] Analytics para comerciantes (visualizações, cliques)
- [ ] Promoções/ofertas com validade
- [ ] QR Code do perfil para impressão
- [ ] Diferenciação de features entre plano FREE e PREMIUM
