# Módulo de Gestão — Plano de Design e Implementação

> **Status:** Fase 0 em produção; Fase 1 em andamento (PRs 1 a 5 em produção — `main`, 2026-09-13); Fase 2 implementada (§12; aguardando merge). Decisões de
> produto fechadas (2026-09-12).
> **Última atualização:** 2026-09-12
> Documento vivo — atualizar ao fim de cada fase com o que foi efetivamente construído.

Hoje o painel do comerciante mistura duas coisas numa única tela de abas: **ser encontrado**
(vitrine, fotos, eventos, palavras-chave, analytics) e **operar a empresa** (cardápio, catálogo,
pedidos, quartos). Este plano separa os dois em módulos e evolui o lado operacional para um
**sistema de gestão** construído **dentro deste projeto**: equipe com permissões, clientes,
vendas/relatórios e estoque.

O produto passa a ter duas propostas de valor vendáveis separadamente:

- **Guia** — "o turista te encontra" (SEO, busca, mapa, vitrine, eventos).
- **Gestão** — "sua loja organizada" (pedidos, clientes, vendas, estoque, equipe).

---

## Decisões fechadas (2026-09-12)

1. **Sem ERP parceiro — ✅ gestão construída neste projeto.** Toda a gestão é implementação
   própria; não há integração com sistema externo. O `docs/integracao-erp.md` fica **arquivado**
   (mantido só como referência de desenho: contrato de catálogo, webhooks, conciliação). O campo
   `catalogoOrigem` proposto lá **não será criado**.
2. **Monetização — ✅ flags por submódulo.** `gestao_equipe`, `gestao_clientes`,
   `gestao_relatorios`, `gestao_estoque`, `gestao_reservas` no `Plan.features`. Os pacotes
   comerciais são montados pelo admin combinando flags — mudar a oferta não exige código.
3. **Permissões — ✅ papéis fixos.** `DONO`, `GERENTE`, `ATENDENTE`, `PRODUCAO`, com permissões
   definidas em código. Reabrir só se um cliente real precisar de um papel que não existe.
4. **Dinheiro — ✅ `Decimal(10,2)` só no domínio de pedidos.** Migram `Pedido`, `PedidoItem`,
   `PedidoConfig.pedidoMinimo` e `ZonaEntrega.taxa`, no início da Fase 3; models novos de gestão já
   nascem `Decimal`. Preço de `Produto`/`CardapioVariacao`/`TipoQuarto` continua `Float` — é
   exibição e entrada de cálculo, e o valor que conta é o snapshot gravado no pedido.
5. **Baixa de estoque — ✅ no aceite do pedido.** Recusado não mexe no estoque; cancelado depois do
   aceite gera estorno automático; aceite sem saldo falha com mensagem.
6. **Estoque — ✅ por produto na v1.** Um saldo por `Produto`; quando o produto tem variações, todas
   compartilham o mesmo saldo. Estoque por variação (roupa P/M/G) fica para quando houver loja
   pedindo.
7. **Multi-loja — ✅ seletor já na Fase 1.** Vínculo usuário↔comércio N:N desde o schema, cookie
   `comercio_ativo` validado contra os vínculos e seletor simples no shell do painel.
8. **Escopo — ✅ fiscal, financeiro e compras fora da v1, no roadmap futuro.** A v1 é gestão leve
   (Fases 0–5). As áreas pesadas ficam listadas no §6 para avaliação posterior.
9. **Titularidade e storage — ✅ storage por `comercioId`, `ownerId` deixa de ser único** (2026-09-12).
   Uploads novos vão para `{comercioId}/...`; arquivos antigos em `{ownerId}/...` ficam onde estão
   (as URLs completas estão salvas no banco). Com isso um usuário pode ser titular de várias lojas
   sem colisão de arquivos (ex.: dois `logo.png` na mesma pasta). A alternativa — um usuário
   "titular técnico" por loja — foi descartada por criar usuários falsos permanentes.

---

## 1. O que o módulo é — e o que fica para depois

**É:** gestão operacional para o comércio local: a pizzaria que anota pedido no caderno, a pousada
que controla quartos no WhatsApp, a loja que não sabe quanto vendeu no mês.

**Fora da v1** (roadmap futuro, §6):

| Fora da v1 | Por que não agora |
|---|---|
| Fiscal (NF-e, NFC-e) | Certificado digital, regras por estado, homologação SEFAZ — depende de provedor e é uma fase inteira |
| Financeiro (contas a pagar/receber, fluxo de caixa) | Só faz sentido com relatório de vendas confiável rodando (Fase 3) |
| Compras e fornecedores | Depende de estoque maduro (Fase 4) |
| PDV com hardware (impressora, gaveta, balança) | Drivers e suporte presencial |
| Pagamento online (gateway) | Decisão já tomada no pedido online: a loja cobra presencialmente |

A ordem das fases não é só priorização: cada área futura **depende** de uma fase da v1 estar
estável — financeiro sem vendas confiáveis, ou compras sem estoque, nascem sem base.

---

## 2. Princípio: três camadas, um dono por domínio

A separação é **lógica, não física**: mesmo repositório, mesmo banco, mesma auth. As tabelas
existentes **não mudam de nome nem de lugar** — o que muda é quem escreve nelas e onde elas
aparecem no painel.

> **Por que não separar em outro app/serviço:** a gestão reusa auth, `getComercioCtx()`,
> catálogo, pedidos e storage que já existem. Separar em serviço duplicaria tudo isso para ganhar
> só complexidade de deploy. O que protege os dois lados é a fronteira de dados (regra derivada
> abaixo e §8), não a fronteira de repositório.

```
┌──────────────────────── NÚCLEO: Empresa ────────────────────────┐
│ Comercio (cadastro, endereço, contato, horários) · Plan/flags   │
│ Usuários e acesso (equipe — Fase 1)                             │
└───────────────┬──────────────────────────────────┬──────────────┘
                │                                  │
     ┌──────────▼───────────┐          ┌───────────▼────────────┐
     │       GESTÃO         │  lê ───► │         GUIA           │
     │ escreve catálogo,    │ (só dado │ vitrine, SEO, busca,   │
     │ pedidos, clientes,   │ público) │ mapa, eventos,         │
     │ estoque, relatórios  │          │ analytics de visitas   │
     └──────────────────────┘          └────────────────────────┘
```

### 2.1 Recursos existentes por camada

| Recurso atual | Camada | Observação |
|---|---|---|
| Dados cadastrais, endereço, contato | **Núcleo** | Formulário "Informações" |
| Horários de funcionamento | **Núcleo** | Gestão usa (bloqueio de pedido), Guia usa ("Aberto agora") |
| Plano e feature flags | **Núcleo** | Passam a liberar submódulos de gestão |
| Cardápio (categorias, itens, variações) | **Gestão** | A página `/cardapio` pública continua no Guia |
| Produtos e Serviços (catálogo + categorias) | **Gestão** | A página `/catalogo` e os destaques continuam no Guia |
| Pedidos (painel, status, config, zonas, push) | **Gestão** | Carrinho, checkout e `/pedido/[token]` são **canal de venda** do Guia |
| Tipos de quarto (hospedagem) | **Gestão** | Base para reservas (Fase 5); cards na vitrine continuam no Guia |
| Logo, descrição, fotos, CTAs | **Guia** | |
| Comodidades e políticas da hospedagem | **Guia** | Conteúdo de vitrine, não inventário |
| Eventos do comércio | **Guia** | Divulgação |
| Palavras-chave | **Guia** | Só existem para a busca |
| Analytics (visitas, origem, cliques) | **Guia** | Marketing. Relatório de **vendas** é Gestão (Fase 3) |
| QR Code, destaque na busca | **Guia** | |
| Bairros (catálogo admin) | Plataforma | Dado da cidade consumido pela Gestão (zonas de entrega) |

**Regra derivada — o que o Guia pode ler da Gestão:** só dado **público e derivado** (título,
preço, foto, `disponivel`). Tabelas com PII ou dado interno (`Cliente`, `MovimentoEstoque`,
`PedidoHistorico`) **nunca** são lidas por páginas públicas.

---

## 3. Navegação do painel

### 3.1 Duas áreas com rotas reais (não mais abas)

```
/comerciante
  layout.tsx                 — shell: switch "Minha vitrine | Gestão" + seletor de comércio
  vitrine/page.tsx           — DashboardTabs atual, só com as abas do Guia
  gestao/
    page.tsx                 — resumo do dia: pedidos abertos, vendas de hoje, estoque baixo
    cardapio/page.tsx
    produtos/page.tsx        — produtos e serviços (tabs internas)
    pedidos/page.tsx
    acomodacoes/page.tsx     — só categoria HOSPEDAGEM
    equipe/page.tsx          — Fase 1
    clientes/page.tsx        — Fase 2
    clientes/[id]/page.tsx
    relatorios/page.tsx      — Fase 3
    estoque/page.tsx         — Fase 4
/comerciante/dashboard       — redirect 308 mapeando ?tab= para a nova rota (links antigos, push) — §10.2
```

**Por que rotas em vez de abas:** gestão é feita de tabelas com filtro, busca e paginação — o
estado precisa estar na URL (voltar do detalhe do cliente para a lista filtrada, mandar link do
relatório de setembro). E cada página busca só o que exibe: hoje `getDashboardComercioData()`
carrega fotos, cardápio, produtos, eventos, quartos e pedidos de uma vez para montar todas as
abas, mesmo que o comerciante só abra uma.

A área **Vitrine** pode continuar em abas (`DashboardTabs`) — são formulários curtos, e mexer
nela não entrega valor novo.

### 3.2 Admin gerenciando a gestão — sem duplicar rotas

Hoje `/admin/comercios/[id]/gerenciar` renderiza o `DashboardTabs` e grava o cookie
`admin_comercio_id`. Com rotas reais, duplicar cada página em `/admin/.../gerenciar/gestao/*`
seria o caminho ingênuo. Proposta:

1. As páginas de `/comerciante/*` passam a resolver o comércio por **`getComercioCtx()`**, não
   por `session.user.id` (hoje só `comerciante/dashboard/page.tsx` faz isso direto).
2. O middleware libera `/comerciante/*` também para ADMIN/SUPER_ADMIN **com** cookie
   `admin_comercio_id` presente.
3. `/admin/comercios/[id]/gerenciar` grava o cookie e redireciona para `/comerciante/vitrine`,
   que exibe o banner "Você está gerenciando X como admin".

Resultado: uma única árvore de páginas, a mesma usada pelo comerciante — o mesmo raciocínio que
já fez as rotas `/api/comerciante/*` servirem os dois. A limitação conhecida do cookie único
(duas abas com comércios diferentes) continua valendo e o banner continua avisando.

### 3.3 Mobile

O comerciante opera pelo celular. A área Gestão ganha nav inferior própria (Resumo · Pedidos ·
Cardápio · Clientes · Mais) no mesmo estilo do `BottomNav` público; "Mais" abre as seções
restantes. O badge de pedidos novos (polling que já existe) fica no ícone de Pedidos.

---

## 4. Monetização

Submódulos entram como **flags de plano** (decisão 2), no padrão de `FEATURES_DISPONIVEIS`:

| Key | Libera | Depende de |
|---|---|---|
| `gestao_equipe` | Membros além do titular, papéis | — |
| `gestao_clientes` | Cadastro de clientes, histórico | — |
| `gestao_relatorios` | Relatórios de vendas, exportação CSV, venda manual | — |
| `gestao_estoque` | Controle de estoque e movimentos | `cardapio` ou catálogo com itens |
| `gestao_reservas` | Agenda de ocupação (Fase 5) | categoria HOSPEDAGEM |

Cardápio, catálogo e pedidos **mantêm as flags atuais** — só mudam de lugar no painel. O
**seletor de multi-loja não é gated**: é navegação, e cada comércio segue o próprio plano.

**Gancho de venda para o plano grátis** (mesmo padrão do analytics): a tela de Clientes e a de
Relatórios abrem para todos mostrando **números reais agregados** ("você teve 38 clientes
diferentes este mês") com o detalhe borrado e cadeado. O dado já existe nos pedidos — é o
argumento mais concreto possível para o upgrade.

---

## 5. Faseamento

Cada fase entrega valor sozinha e tem critério de pronto verificável.

### Fase 0 — Reorganização do painel (sem feature nova) ✅ implementada (branch `feat/gestao-fase-0`)

> Plano de execução detalhado (PRs, arquivos e verificação) no **§10**. O resumo abaixo é o
> escopo. **Desvios do plano na implementação:** (1) o redirect de `/comerciante/dashboard` ficou no
> middleware, não numa página — evita renderizar o layout e consultar o banco só para redirecionar;
> (2) o alerta de pedidos cobre o **painel inteiro** (inclusive Minha vitrine), não só a Gestão;
> (3) a nav mobile não tem "Mais" — com no máximo 5 itens hoje, todos cabem; (4) "Informações"
> (dados do Núcleo) ficou em Minha vitrine até existir uma área própria de Empresa.

- Layout `/comerciante` com switch Vitrine | Gestão.
- Mover Cardápio, Produtos, Serviços, Pedidos e Tipos de quarto para `/comerciante/gestao/*`.
  Os managers existentes (`cardapio/manager.tsx`, `produtos-manager.tsx`,
  `pedidos/pedidos-manager.tsx`, `hospedagem/quartos-manager.tsx`) são reusados como estão —
  cada página vira um Server Component que busca só o seu dado e renderiza o manager.
- Separar `hospedagem-manager.tsx`: quartos → Gestão; `perfil-form.tsx` (comodidades/políticas) →
  Vitrine.
- Resumo do dia em `/comerciante/gestao` com o que já existe: pedidos por grupo
  (`grupoDoStatus`), faturamento de hoje (soma de pedidos `CONCLUIDO`).
- Mudanças do §3.2 (páginas via `getComercioCtx`, middleware, redirect do `gerenciar`).
- Web Push: conferir que a URL de destino da notificação aponta para `/comerciante/gestao/pedidos`.

**Critério de pronto:** comerciante e admin encontram tudo que existia antes, nas duas áreas;
nenhuma rota de API mudou; `npm run build` + `next start` sem regressão.

### Fase 1 — Equipe, permissões e multi-loja

A mudança estrutural mais pesada — vem primeiro porque **todas** as fases seguintes precisam
saber *quem* fez a ação (quem aceitou o pedido, quem ajustou o estoque).

**Schema:**

```prisma
enum PapelMembro {
  DONO       // tudo, inclusive equipe e plano
  GERENTE    // tudo operacional + relatórios, sem equipe
  ATENDENTE  // pedidos, clientes, cardápio (disponibilidade), sem relatórios
  PRODUCAO   // só a fila de pedidos (cozinha/preparo)
}

model ComercioMembro {
  id         String      @id @default(cuid())
  comercioId String
  userId     String
  papel      PapelMembro
  ativo      Boolean     @default(true)
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  comercio Comercio @relation(fields: [comercioId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([comercioId, userId])
  @@index([userId])
  @@map("comercio_membros")
}

// Quem mudou o quê no pedido — o ganho imediato de ter equipe.
model PedidoHistorico {
  id        String       @id @default(cuid())
  pedidoId  String
  status    PedidoStatus
  userId    String?      // null = cliente (cancelamento pelo /pedido/[token])
  motivo    String?
  createdAt DateTime     @default(now())

  pedido Pedido @relation(fields: [pedidoId], references: [id], onDelete: Cascade)

  @@index([pedidoId, createdAt])
  @@map("pedido_historicos")
}

// User ganha: trocarSenha Boolean @default(false), membros ComercioMembro[]
```

**`Comercio.ownerId` continua existindo** como o *titular* da conta (quem o admin cadastrou como
responsável), mas **perde o `@unique`** (decisão 9) e deixa de decidir acesso: a migração cria um
`ComercioMembro { papel: DONO }` para cada `ownerId` atual e, a partir daí, **acesso** é decidido
só por `ComercioMembro`. A relação `User.comercio` (1:1) vira `User.comerciosTitular` (1:N).

**Permissões em código, não em banco** (decisão 3): `src/lib/gestao/permissoes.ts` mapeia
`PapelMembro → Permissao[]` (`pedidos:operar`, `cardapio:editar`, `clientes:ver`,
`relatorios:ver`, `estoque:ajustar`, `equipe:gerenciar`, `vitrine:editar`...).

**`getComercioCtx()` evolui**, sem mudar de assinatura para quem já usa:

```ts
interface ComercioCtx {
  comercioId: string
  ownerId: string
  isAdmin: boolean
  features: unknown
  papel: PapelMembro | null   // null quando isAdmin
  userId: string
}

export function exigirPermissao(ctx: ComercioCtx, p: Permissao): boolean
// admin passa sempre; membro passa se o papel tiver a permissão
```

- COMERCIANTE resolve por `ComercioMembro` (não mais por `ownerId`).
- **Multi-loja (decisão 7):** com mais de um vínculo ativo, o comércio vem do cookie
  `comercio_ativo` (httpOnly, mesmo padrão do `admin_comercio_id`) — **validado contra os vínculos
  do usuário a cada request**, nunca honrado cru. Cookie ausente ou inválido ⇒ primeiro vínculo.
  O seletor no shell troca o cookie via `POST /api/comerciante/comercio-ativo` e recarrega a rota.
  Com um vínculo só, o seletor não aparece.
- **Papel fica fora do JWT.** O ctx já faz uma query por request; colocar o papel no token faria
  um membro rebaixado ou removido manter o acesso até o token expirar. Mesmo motivo para não pôr
  a lista de comércios no token.
- As **26 rotas** de `/api/comerciante/*` ganham `exigirPermissao` com a permissão adequada. Como
  todas já passam por `getComercioCtx()`, é uma linha por handler — é por isso que a regra "rota
  nova usa o helper" foi fechada antes.
- A UI esconde o que o papel não permite, mas **a API é a barreira** (a UI é conveniência).

**Convite:** o projeto não tem e-mail transacional. v1: o DONO cadastra nome + e-mail e o sistema
gera uma **senha temporária exibida uma única vez** para ele repassar; o membro é obrigado a
trocar no primeiro login (`User.trocarSenha`). Se o e-mail já existir (pessoa que trabalha em duas
lojas), cria só o vínculo, sem senha nova. E-mail de convite fica para quando houver provedor.

**Critério de pronto:** o dono cadastra um atendente; o atendente loga, vê só Pedidos, Clientes e
Cardápio, aceita um pedido, e o histórico mostra o nome dele; uma chamada direta à API de
relatórios com a sessão do atendente retorna 403. Um usuário com duas lojas troca pelo seletor e
cada tela passa a mostrar só os dados da loja escolhida; um cookie `comercio_ativo` forjado com o
id de uma loja sem vínculo é ignorado.

### Fase 2 — Clientes (CRM leve)

Os pedidos já coletam nome e WhatsApp — hoje esse dado morre dentro de cada `Pedido`.

> **Decisões de 2026-09-13 (ajustam o desenho abaixo):** (1) permissões — dono e gerente veem e
> editam clientes; atendente só vê (já vê nome/WhatsApp nos pedidos); produção não vê; (2) **sem
> agregados denormalizados** — total gasto, nº de pedidos e último pedido são calculados em SQL a
> partir dos pedidos (barato no volume de uma loja, nunca desatualiza e não acopla o cliente ao
> `Float` dos pedidos antes da Fase 3a); (3) checkout com **aviso informativo**, sem checkbox (os
> dados são necessários para executar o pedido); (4) **cadastro manual de cliente já na Fase 2**.
> Plano de execução no §12.

```prisma
model Cliente {
  id          String    @id @default(cuid())
  comercioId  String
  nome        String
  whatsapp    String?   // normalizado (só dígitos, com DDD, sem 55); null = cliente de balcão sem WhatsApp
  email       String?
  aniversario DateTime? @db.Date
  observacoes String?   @db.Text   // "alérgico a amendoim", "sempre pede sem cebola"
  tags        String[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  comercio Comercio @relation(fields: [comercioId], references: [id], onDelete: Cascade)
  pedidos  Pedido[]

  @@unique([comercioId, whatsapp])   // Postgres aceita vários null
  @@map("clientes")
}

// Pedido ganha: clienteId String? (onDelete: SetNull)
```

- **Vínculo por `(comercioId, whatsapp)`** dentro da transação que já cria o pedido e incrementa
  `proximoNumero` em `POST /api/pedidos`. O snapshot `clienteNome`/`clienteWhats` do `Pedido`
  **continua** — o cliente pode ser editado ou excluído, o pedido não.
- Totais do cliente (pedidos, gasto, último pedido, ticket, itens mais pedidos) **calculados em SQL**
  sobre os pedidos `CONCLUIDO` do cliente. Script de backfill cria os clientes dos pedidos existentes.
- Cadastro manual (cliente de balcão), busca, filtro por tag, "clientes sumidos há 30+ dias",
  aniversariantes do mês, botão de WhatsApp.
- Detalhe do cliente: histórico de pedidos, itens mais pedidos, ticket médio.

**LGPD — regras não negociáveis:**

1. **Cliente é da loja, nunca da plataforma.** Não existe cadastro global de consumidor: o mesmo
   WhatsApp em duas lojas são dois `Cliente` sem ligação. Nenhuma tela ou query cruza lojas —
   **inclusive para o dono com várias lojas** (decisão 7): cada loja vê só os seus clientes.
2. O checkout ganha aviso curto: "seus dados ficam com {loja} para preparar e entregar o pedido".
3. **Exclusão a pedido do titular:** remover o `Cliente` e anonimizar `clienteNome`/`clienteWhats`
   nos pedidos dele (os valores continuam nos relatórios).
4. **Nunca cruzar com `AnalyticsEvent`**, que é anônimo por design (`docs/analytics.md`).
5. Admin da plataforma acessando clientes via "gerenciar" é tratamento de dado — registrar em log
   de auditoria quando essa fase entrar.

**Critério de pronto:** cliente que já pediu 3 vezes aparece com histórico e total gasto; um
pedido novo do mesmo WhatsApp incrementa o registro existente em vez de duplicar.

### Fase 3 — Vendas e relatórios

**3a. Migração para `Decimal` (decisão 4) — primeiro passo da fase, em PR próprio.**

| Model | Campos |
|---|---|
| `Pedido` | `subtotal`, `taxaEntrega`, `total`, `trocoPara` |
| `PedidoItem` | `precoUnit` |
| `PedidoConfig` | `pedidoMinimo` |
| `ZonaEntrega` | `taxa` |

Três cuidados que fazem essa migração dar certo:

- **Serialização:** `Prisma.Decimal` não atravessa a fronteira Server → Client Component, e em
  `JSON.stringify` vira **string** (`"12.50"`). Sem tratamento, o polling de
  `/api/comerciante/pedidos` passa a devolver string onde a UI espera número e a soma do carrinho
  concatena texto. Criar `src/lib/dinheiro.ts` com `toNumber()` e um serializador de pedido usado
  por **todas** as respostas de API e props de Client Component que carregam pedido.
- **Cálculo:** `calcularSubtotal`/`calcularTotal` em `src/lib/pedidos.ts` passam a trabalhar em
  **centavos inteiros** internamente (`Math.round(preco * 100)`) e devolvem `Decimal` para gravar.
  O preço de entrada continua vindo de `Produto.preco` (`Float`) — o arredondamento acontece uma
  vez, na borda, e o snapshot gravado é exato.
- **Migração do dado:** `ALTER COLUMN ... TYPE DECIMAL(10,2) USING ROUND(col::numeric, 2)` via
  migration, com o `DIRECT_URL` (porta 5432), como o restante do DDL do projeto.

**Critério de pronto da 3a:** fluxo completo de pedido (carrinho → checkout → painel → status →
acompanhamento) idêntico ao anterior; nenhuma resposta de API com valor monetário em string.

**3b. Venda manual** — o que transforma o módulo em gestão de verdade: sem ela, relatório só
mostra o que veio do guia, e a loja vende muito mais por telefone e balcão.

```prisma
enum OrigemPedido {
  ONLINE     // checkout do cardápio público
  BALCAO     // lançado no painel
  TELEFONE   // lançado no painel (WhatsApp/ligação)
}
// Pedido ganha: origem OrigemPedido @default(ONLINE), criadoPorId String?
```

A venda manual **reusa tudo** do pedido online: mesmo `PedidoItem` com snapshot, mesma
numeração, mesma máquina de estados (pode nascer direto em `CONCLUIDO` no balcão), mesmo vínculo
com `Cliente`. Não é um PDV — é "lançar pedido" com busca de item e cliente, pensado para celular.

> Venda que nasce `CONCLUIDO` **passa pelo aceite** para efeito de estoque (decisão 5): a função
> de criação aplica a baixa como se tivesse havido o `ACEITO`. Senão, venda de balcão nunca
> baixaria estoque.

**3c. Relatórios** (`src/lib/gestao/relatorios.ts`, agregação em SQL):

- Faturamento por dia / semana / mês, com comparação ao período anterior
- Ticket médio, número de pedidos, por origem (online × balcão × telefone)
- Itens mais vendidos (por `PedidoItem.titulo` + `variacaoNome` — o snapshot é a fonte, porque o
  produto pode ter sido renomeado ou excluído)
- Por forma de pagamento — o "fechamento do dia" que a loja faz no caderno
- Taxas de entrega arrecadadas, por zona
- Cancelamentos e recusas, com motivos
- **Conversão guia → venda:** visitas ao cardápio (`AnalyticsEvent`, agregado) × pedidos online
  no mesmo período — a única junção permitida entre os dois mundos, e só em números agregados.
- Exportação CSV

**Fuso:** agrupar por dia com `date_trunc('day', "createdAt" AT TIME ZONE 'America/Sao_Paulo')`.
Agrupar em UTC joga as vendas das 21h às 23h59 no dia seguinte — exatamente o horário de pico de
pizzaria. Reusar a constante de fuso existente (regra 3 do `multitenant.md`).

**Critério de pronto da fase:** o dono lança uma venda de balcão, fecha o dia e o relatório bate
centavo a centavo com a soma manual dos pedidos, separado por forma de pagamento.

### Fase 4 — Estoque simples

```prisma
// Produto ganha:
//   controlaEstoque Boolean @default(false)
//   estoque         Int?
//   estoqueMinimo   Int?     // alerta de "estoque baixo"

enum TipoMovimento {
  ENTRADA    // compra/produção
  AJUSTE     // contagem, perda, quebra
  VENDA      // baixa por pedido
  ESTORNO    // pedido cancelado depois da baixa
}

model MovimentoEstoque {
  id         String        @id @default(cuid())
  comercioId String
  produtoId  String
  tipo       TipoMovimento
  quantidade Int           // positivo entra, negativo sai
  saldoApos  Int
  pedidoId   String?
  userId     String?
  motivo     String?
  createdAt  DateTime      @default(now())

  @@index([produtoId, createdAt])
  @@index([comercioId, createdAt])
  @@map("movimentos_estoque")
}
```

- **Baixa no `ACEITO`** (decisão 5): pedido recusado não mexe no estoque, e é o momento em que a
  loja confirmou que tem o item. Estorno automático (`ESTORNO`) se o pedido for cancelado depois
  do aceite — detectado pela existência de movimento `VENDA` com aquele `pedidoId`, não por
  inferência do status anterior.
- **Por produto** (decisão 6): `PedidoItem` com variação baixa do saldo do `Produto` pai. O item
  guarda `produtoId` como referência fraca — pedido cujo produto foi excluído simplesmente não
  baixa nada.
- Decremento **atômico**: `updateMany({ where: { id, estoque: { gte: qtd } }, data: { estoque:
  { decrement: qtd } } })` — zero linhas afetadas ⇒ sem saldo ⇒ o aceite inteiro falha (transação)
  com a lista de itens sem saldo, em vez de estoque negativo por dois atendentes aceitando ao mesmo
  tempo. Pedido com vários itens: somar quantidades por `produtoId` antes de decrementar.
- Zerou com `controlaEstoque` ligado ⇒ `disponivel = false` automaticamente (o cardápio público já
  respeita esse campo, nada muda no Guia). Voltou a ter entrada ⇒ volta a ficar disponível.
- O saldo em `Produto.estoque` é a verdade para leitura rápida; `MovimentoEstoque` é o extrato que
  explica o saldo. Toda escrita de estoque passa por `src/lib/gestao/estoque.ts`, que grava os dois
  na mesma transação — nenhuma rota escreve `estoque` direto.
- **Sem reserva no checkout.** Entre o cliente enviar e a loja aceitar, dá para dois clientes
  pedirem o último item; o segundo aceite falha e a loja recusa com motivo. É como o delivery local
  já opera. Reserva na criação foi considerada e descartada (decisão 5): prende estoque em pedido
  que a loja pode recusar ou esquecer de responder.

**Critério de pronto:** item com estoque 2 recebe dois pedidos; o primeiro aceite baixa para 1, o
segundo para 0 e o item some do cardápio público; cancelar um dos pedidos devolve 1 e o item volta.

### Fase 5 — Reservas e agenda (opcional, por demanda)

- **Hospedagem:** `TipoQuarto` ganha `unidades Int`; model `Reserva` (tipo de quarto, check-in,
  check-out, hóspede → `Cliente`, status, valor em `Decimal`). Calendário de ocupação e bloqueio de
  datas. Reservas **lançadas manualmente** (vindas do WhatsApp) — continua sem motor de reserva
  público.
- **Serviços com horário** (salão, passeio guiado): agenda por profissional/recurso.

Só iniciar com pelo menos uma pousada ou prestador pedindo — é a fase com mais regra de negócio
específica e a menos reaproveitável.

---

## 6. Roadmap futuro (fora da v1)

Listado para não se perder, **sem desenho ainda**. Cada item só entra em planejamento quando a
fase de que depende estiver em produção e houver demanda real.

| Área | Depende de | Nota |
|---|---|---|
| Financeiro simples (contas a pagar/receber, fluxo de caixa) | Fase 3 | O "fechamento do dia" dos relatórios é o embrião |
| Estoque por variação | Fase 4 | Loja de roupa/calçado (decisão 6) |
| Compras e fornecedores | Fase 4 | Entrada de estoque vinculada a nota de compra |
| Fiscal (NFC-e / NF-e) | Fase 3 | Via provedor de emissão (API), nunca integração direta com SEFAZ |
| E-mail transacional | Fase 1 | Destrava convite de membro por e-mail e recuperação de senha |
| PDV de balcão com hardware | Fases 3 e 4 | Só se a venda manual pelo celular não bastar |

O `docs/integracao-erp.md` (arquivado) tem desenho reaproveitável se algum dia for preciso expor
API para sistemas de terceiros: auth de máquina, webhook assinado com HMAC, reconciliação
incremental e conciliação de catálogo na primeira sincronização.

---

## 7. Regras vigentes desde já

1. **Rota nova de gestão** fica em `/api/comerciante/gestao/*` e passa por `getComercioCtx()` — a
   partir da Fase 1, também por `exigirPermissao()`.
2. **Models de gestão não levam `cityId`.** São da empresa, não da cidade — complemento da regra 4
   do `multitenant.md`. Penduram em `comercioId` e herdam o tenant por ele.
3. **Páginas públicas nunca consultam** `Cliente`, `MovimentoEstoque`, `PedidoHistorico` nem campos
   internos. O Guia lê só o derivado (`disponivel`, preço).
4. **Toda escrita com efeito colateral** (estoque, agregados de cliente, histórico) vive numa função
   em `src/lib/gestao/*` chamada dentro de transação — nunca espalhada pelos handlers.
5. **A gestão não depende de aprovação no guia.** Um comércio `PENDENTE` ou `INATIVO` usa a área
   Gestão normalmente — abre caminho para vender gestão para quem nem quer aparecer no guia.
6. **Nada de agregação em JS** para relatório: a agregação roda no Postgres. Buscar pedidos para
   somar em memória funciona com 50 pedidos e cai com 5.000.
7. **Valor monetário novo de gestão nasce `Decimal(10,2)`** e sai para o client por
   `src/lib/dinheiro.ts` (decisão 4).
8. **Nenhuma query de gestão cruza comércios**, nem para o dono de várias lojas. Visão consolidada
   multi-loja, se um dia existir, é feature explícita com desenho próprio.

---

## 8. Arquitetura de arquivos (alvo)

```
src/app/comerciante/
  layout.tsx
  vitrine/page.tsx
  gestao/**/page.tsx                    — ver §3.1
src/app/api/comerciante/
  comercio-ativo/route.ts               — troca de loja (Fase 1)
  gestao/
    equipe/route.ts, equipe/[id]/route.ts
    clientes/route.ts, clientes/[id]/route.ts
    vendas/route.ts                     — venda manual
    relatorios/route.ts                 — CSV
    estoque/movimentos/route.ts
src/lib/
  dinheiro.ts                           — Decimal ↔ number, serializador de pedido (Fase 3a)
  gestao/
    permissoes.ts                       — PapelMembro → Permissao[], exigirPermissao
    clientes.ts                         — upsert por whatsapp, agregados, anonimização
    relatorios.ts                       — queries SQL agregadas
    estoque.ts                          — baixa, estorno, ajuste (transacional)
src/components/gestao/
  shell/                                — switch de área, nav mobile, seletor de comércio
  resumo/, clientes/, relatorios/, estoque/, equipe/
```

Os componentes existentes em `src/components/comerciante/` (cardápio, produtos, pedidos, quartos)
**não se movem** na Fase 0 — só passam a ser renderizados por páginas da área Gestão. Mover arquivo
sem mudar comportamento só gera diff para revisar.

---

## 9. Referências no código existente

- `src/lib/comercio-ctx.ts` — `getComercioCtx()`; ponto central da Fase 1.
- `src/middleware.ts` — gate de `/comerciante/*` e cookie `admin_comercio_id` (§3.2).
- `src/lib/admin-comercio-cookie.ts` — padrão para o cookie `comercio_ativo` (módulo sem imports,
  seguro no Edge).
- `src/lib/dashboard-comercio.ts` — query monolítica do painel, a ser fatiada por página na Fase 0.
- `src/components/comerciante/dashboard-tabs.tsx` — `ABAS` e o gating por `feature`/`categoria`.
- `src/app/api/pedidos/route.ts` — transação de criação (`proximoNumero`); onde entram o upsert de
  `Cliente` e a `origem`.
- `src/app/api/comerciante/pedidos/[id]/route.ts` — transição de status; onde entram
  `PedidoHistorico`, agregados de cliente e baixa/estorno de estoque.
- `src/lib/pedidos.ts` — máquina de estados (`podeTransicionar`) e `calcularSubtotal`/`arredondar`,
  que passam a centavos na Fase 3a.
- `src/app/api/admin/comercios/route.ts` — criação de comércio + vínculo DONO do titular (§11.1).
- `src/lib/plan-features.ts` — onde entram as flags `gestao_*`.
- `src/components/comerciante/analytics-panel.tsx` — padrão do teaser borrado para plano grátis.
- `docs/pedido-online.md` — decisões do pedido (snapshot, token, sem pagamento online).
- `docs/multitenant.md` — regras da V1 que este plano complementa.

---

## 10. Plano de execução — próximos passos

Levantamento feito no código em 2026-09-12. Ordem pensada para que cada PR seja pequeno,
verificável sozinho e não quebre o painel em uso.

### 10.0 Pré-requisito — consolidar a `main` ✅ (2026-09-12)

A `main` está em `bbd5410`. Três entregas **ainda não entraram** e vivem empilhadas na branch
`feat/admin-edita-comercio`:

```
3d32a7a feat: pedido online no cardápio (MVP) com web push e taxa por bairro
af55c1e fix: import dinâmico do heic2any
ad969b8 feat: admin gerencia o painel completo de qualquer comércio
```

A Fase 0 reescreve justamente `dashboard-tabs.tsx`, a página `gerenciar`, o middleware e o push —
os arquivos que essas branches introduziram. Começar a Fase 0 em cima delas sem mergear gera uma
pilha de 4 branches dependentes e conflito garantido.

- [x] Mergear `feat/admin-edita-comercio` na `main` (leva junto o pedido online e o fix do heic2any)
- [x] Commitar os docs: `docs/modulo-gestao.md`, `docs/integracao-erp.md` (arquivado),
      `docs/panorama-projeto.md`, `CLAUDE.md`
- [x] Criar `feat/gestao-fase-0` a partir da `main` atualizada

### 10.1 PR 1 — Admin usa as mesmas páginas do comerciante ✅ implementado (branch `feat/gestao-fase-0`)

**Objetivo:** eliminar a segunda árvore de páginas **antes** de dividir o painel. Se a divisão
viesse primeiro, cada página nova de gestão precisaria de uma cópia em `/admin/.../gerenciar`.
Sem mudança visual para o comerciante.

| Arquivo | Mudança |
|---|---|
| `src/middleware.ts` | Em `/admin/comercios/[id]/gerenciar`: grava o cookie **e redireciona** para `/comerciante/dashboard`. Em `/comerciante/*`: aceita ADMIN/SUPER_ADMIN **se** o cookie `admin_comercio_id` existir; sem cookie ⇒ `/admin/comercios` |
| `src/app/comerciante/layout.tsx` | Troca o `role !== "COMERCIANTE"` por `getComercioCtx()`: `null` ⇒ redirect (`/admin/comercios` para admin, `/admin/login` para os demais) |
| `src/app/comerciante/dashboard/page.tsx` | Resolve por `getComercioCtx()` em vez de `session.user.id`. Com `ctx.isAdmin`: banner âmbar (texto do `gerenciar` atual) e "← Voltar ao admin" no lugar de "Sair" — senão o botão desloga o admin |
| `src/lib/dashboard-comercio.ts` | `where` passa a ser só `{ id }` (a variante `ownerId` some) |
| `src/app/admin/(painel)/comercios/[id]/gerenciar/page.tsx` | **Removido** — o middleware redireciona antes de chegar nele |

**Verificação** (skill `verify`, com `next start`):
- Comerciante: painel idêntico, todas as abas salvam.
- Admin: "Gerenciar painel" → cai em `/comerciante/dashboard` com banner; salvar foto, item de
  cardápio e status de pedido afeta o comércio certo; "Voltar ao admin" funciona.
- Comerciante com cookie `admin_comercio_id` forjado continua vendo **só** o próprio comércio.
- Admin sem cookie acessando `/comerciante/dashboard` ⇒ redirect para `/admin/comercios`.

### 10.2 PR 2 — Divisão em "Minha vitrine" e "Gestão" ✅ implementado

**Objetivo:** mover as seções para as duas áreas, reusando os managers sem alterá-los. Os
managers guardam estado local e chamam as mesmas rotas de API (nenhum usa `router.refresh`
nem `revalidatePath` do dashboard), então trocar a página que os renderiza é seguro.

**Rotas:**

| Rota | Conteúdo | Gate |
|---|---|---|
| `/comerciante` (`page.tsx`) | Decide o destino: `pedido_online` ativo ⇒ `/gestao/pedidos`; senão ⇒ `/vitrine` | — |
| `/comerciante/vitrine?tab=` | Abas: Informações, Analytics, Fotos, Comodidades e políticas (só HOSPEDAGEM — `PerfilForm`), Eventos, Palavras-chave | flags atuais |
| `/comerciante/gestao/cardapio` | `CardapioManager` | `cardapio` (sem a flag: tela com cadeado, não 404) |
| `/comerciante/gestao/produtos?tipo=` | `ProdutosManager` com tabs Produtos · Serviços | — |
| `/comerciante/gestao/pedidos` | `PedidosManager` + `PedidoConfigForm` + `ZonasEntregaManager` + `PushToggle` | `pedido_online` (cadeado) |
| `/comerciante/gestao/acomodacoes` | `QuartosManager` | categoria HOSPEDAGEM (senão `notFound()`) |

**Arquivos:**

| Arquivo | Mudança |
|---|---|
| `src/app/comerciante/layout.tsx` | Vira o **shell**: cabeçalho (nome, status, plano), switch Vitrine · Gestão, sub-navegação da área em links, banner de admin. Busca só `nome/status/plan/categorias` |
| `src/lib/painel/queries.ts` (novo) | Substitui `dashboard-comercio.ts` por um loader por página: `getVitrineData`, `getCardapioData`, `getCatalogoData`, `getPedidosData`, `getQuartosData`. As serializações de pedido/config/zona saem do arquivo atual sem mudança |
| `src/lib/dashboard-comercio.ts` | **Removido** |
| `src/components/comerciante/dashboard-tabs.tsx` | Renomeado para `vitrine-tabs.tsx`; perde Cardápio, Pedidos, Produtos, Serviços e Hospedagem→quartos |
| `src/components/comerciante/hospedagem-manager.tsx` | **Removido** — as duas metades são renderizadas direto nas páginas |
| `src/app/comerciante/dashboard/page.tsx` | Vira **redirect 308** mapeando `?tab=`: `pedidos`→`/gestao/pedidos`, `cardapio`→`/gestao/cardapio`, `produtos`→`/gestao/produtos`, `servicos`→`/gestao/produtos?tipo=servico`, `hospedagem`→`/gestao/acomodacoes`, demais→`/vitrine?tab=<tab>` |
| `src/middleware.ts` | Redirect pós-login e o do PR 1 apontam para `/comerciante` |
| `src/lib/push.ts` | `url` do novo pedido ⇒ `/comerciante/gestao/pedidos` |
| `public/sw-push.js` | Foco em aba aberta passa a casar `/comerciante` (não só `/dashboard`) e chama `client.navigate(url)` antes do `focus()` — hoje ele foca a aba mas **não leva até os pedidos** |

> **Por que o redirect de `/comerciante/dashboard` é permanente e não temporário:** o service
> worker antigo continua instalado nos celulares dos comerciantes até o navegador buscar a versão
> nova, e ele manda para `/comerciante/dashboard?tab=pedidos`. O mapeamento garante que o clique na
> notificação continue abrindo os pedidos durante essa janela — e para sempre em links salvos.

> **Painel de pedidos precisa de aviso de aba aberta:** hoje o texto diz "mantenha esta aba
> aberta". Com rotas separadas, navegar para Cardápio desmonta o `PedidosManager` e **para o
> polling e o som**. O push cobre o caso com navegador fechado, mas quem não ativou push deixa de
> ouvir pedidos ao trocar de tela. Solução no PR 2: mover o polling de contagem de novos pedidos
> para o **shell** (badge + som em qualquer página da área Gestão); o `PedidosManager` segue com a
> lista completa.

**Verificação:**
- Todas as seções acessíveis nas duas áreas, para comerciante e admin.
- `/comerciante/dashboard?tab=pedidos` (link antigo) abre os pedidos.
- Notificação de push com aba aberta em outra tela leva até `/gestao/pedidos`.
- Estando em `/gestao/cardapio`, um pedido novo toca o som e acende o badge.
- Plano sem `cardapio`/`pedido_online`: telas com cadeado, sem 404 nem erro.
- Comércio não-HOSPEDAGEM: sem "Acomodações" e sem "Comodidades e políticas".
- `npm run build` + `next start` sem erro de SSR.

### 10.3 PR 3 — Resumo do dia e navegação mobile ✅ implementado

- `/comerciante/gestao/page.tsx`: pedidos por grupo (`grupoDoStatus`), faturamento de hoje
  (pedidos `CONCLUIDO`, dia no fuso `America/Sao_Paulo`), atalhos. Sem `pedido_online`: atalhos
  para cardápio e produtos + chamada para o recurso.
- Nav inferior da área Gestão no mobile (Resumo · Pedidos · Cardápio · Produtos · Mais), com o
  badge de pedidos novos do shell. "Clientes" entra no lugar de "Produtos" quando a Fase 2 existir.
- `/comerciante` passa a mandar para `/gestao` (resumo) quando `pedido_online` estiver ativo.

**Verificação:** números do resumo batem com a lista de pedidos; nav utilizável em 375px.

### 10.4 Depois da Fase 0

Fase 0 em produção (`main`, 2026-09-12). Próxima: **Fase 1 — plano de execução no §11**.

---

## 11. Plano de execução — Fase 1 (equipe, permissões e multi-loja)

Levantamento feito no código em 2026-09-12. Mesma lógica da Fase 0: PRs pequenos, cada um
verificável sozinho, em ordem de dependência. Branch `feat/gestao-fase-1`.

### Achados do levantamento que moldam a ordem

- **O projeto não usa migrations** (`prisma/migrations` não existe): o schema vai por
  `npm run db:push` e migrações de dado por script em `prisma/` (padrão do
  `migrate-unify-produto.ts`). Cada PR com schema novo lista o passo de deploy.
- **9 rotas `[id]` autorizam comparando `item.comercio.ownerId === ctx.ownerId`** (fotos, tags,
  eventos, produtos, itens e categorias do cardápio, categorias do catálogo, quartos, pedidos).
  Com `ownerId` não-único isso vira **falha de autorização**: o dono de duas lojas conseguiria
  editar itens da loja B estando com a loja A ativa. Por isso a troca para `comercioId` entra no
  PR 1, junto com a remoção do `@unique` — não depois.
- **Uploads chaveados por `ownerId`** (`{ownerId}/logo.ext` com `x-upsert`): dois comércios do
  mesmo titular sobrescreveriam o logo um do outro. Resolvido pela decisão 9 no PR 1.
- **`POST /api/admin/comercios` bloqueia usuário que já tem comércio** e o dialog de criação só
  lista usuários sem comércio. O bloqueio **fica** até o PR 4 — sem seletor de loja, a segunda
  loja de um usuário seria inalcançável pelo painel.

### 11.1 PR 1 — Vínculos e storage (fundação, sem mudança visível) ✅ implementado

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | `enum PapelMembro`, `model ComercioMembro`; `Comercio.ownerId` sem `@unique` (+ `@@index`); `User.comercio` → `User.comerciosTitular Comercio[]`; `User.membros ComercioMembro[]` |
| `prisma/migrate-membros-dono.ts` (novo) | Cria `ComercioMembro { DONO }` para cada comércio a partir do `ownerId`. Idempotente (`skipDuplicates`) — pode rodar mais de uma vez |
| `src/lib/comercio-ctx.ts` | COMERCIANTE resolve pelo vínculo ativo (hoje só existe o DONO — comportamento idêntico). `ComercioCtx` ganha `userId` e `papel` (`null` para admin) |
| 9 rotas `[id]` de `/api/comerciante/*` | Autorização por `item.comercioId === ctx.comercioId` |
| `src/app/api/comerciante/upload/route.ts` | Path `{comercioId}/...`; admin com `comercioId` no form só confirma que o comércio existe |
| `src/app/api/admin/comercios/route.ts` | Cria o comércio **e** o vínculo DONO na mesma transação; bloqueio de "já possui comércio" passa a olhar `comerciosTitular` |
| `src/app/api/admin/usuarios/route.ts`, `admin/(painel)/usuarios/page.tsx` | Leem `comerciosTitular` no lugar de `comercio` (o JSON da API mantém o campo `comercio` para o dialog) |

**Deploy:** `npm run db:push` (produção: com `DIRECT_URL`) **e em seguida**
`npx tsx prisma/migrate-membros-dono.ts` — **antes** de publicar o código. Código novo sem o
script = comerciante sem vínculo = "Nenhum comércio vinculado".

**Verificação:** comerciante e admin idênticos ao antes; upload novo cai em `{comercioId}/...` e
logo/fotos antigos continuam aparecendo; item de outro comércio via rota `[id]` retorna 404/403;
rodar o script duas vezes não duplica vínculo; criar comércio pelo admin gera o vínculo DONO.

### 11.2 PR 2 — Permissões ✅ implementado

`src/lib/gestao/permissoes.ts` — matriz fixa (decisão 3):

| Permissão | DONO | GERENTE | ATENDENTE | PRODUCAO |
|---|:-:|:-:|:-:|:-:|
| `vitrine:editar` (informações, logo, fotos, eventos, tags, comodidades) | ✅ | ✅ | | |
| `analytics:ver` | ✅ | ✅ | | |
| `cardapio:editar` / `catalogo:editar` / `quartos:editar` | ✅ | ✅ | | |
| `itens:disponibilidade` (só ligar/desligar `disponivel` de itens do cardápio **e** do catálogo) | ✅ | ✅ | ✅ | |
| `pedidos:operar` (ver lista, mudar status) | ✅ | ✅ | ✅ | ✅ |
| `pedidos:configurar` (config, zonas de entrega) | ✅ | ✅ | | |
| `vendas:ver` (faturamento e ticket no resumo; relatórios na Fase 3) | ✅ | ✅ | | |
| `equipe:gerenciar` | ✅ | | | |

- `exigirPermissao(ctx, p)` em todas as rotas de `/api/comerciante/*` (27 com o `resumo`); admin
  passa sempre. Recusa ⇒ **403**.
- `itens:disponibilidade`: `PATCH` de item/produto aceita a permissão **só** quando o corpo
  contém apenas `disponivel` — senão exige `cardapio:editar`/`catalogo:editar`. (Planejado como
  `cardapio:disponibilidade`; ampliado na implementação porque o botão Visível/Oculto do catálogo
  usa a mesma rota e o atendente também marca produto esgotado.)
- **Implementação:** matriz em `src/lib/gestao/permissoes.ts` (sem runtime — usada no client);
  guards `negarSemPermissao(ctx, ...)` / `pode(ctx, ...)` em `src/lib/comercio-ctx.ts`;
  `getPainelBase()` expõe `permissoes`. `produtos` e `produtos/[id]` decidem pelo item
  (`categoriaCardapioId` → cardápio; senão catálogo — na origem e no destino, se o PATCH mover o
  item); `upload` decide pelo `tipo`. Managers de cardápio e catálogo ganharam
  `somenteDisponibilidade`. De quebra: o PATCH de produto passou a validar que a
  `categoriaCardapioId` de destino é do mesmo comércio (antes não validava).
- Páginas e navegação: itens sem permissão **somem** (diferente de feature fora do plano, que
  mostra cadeado — lá o dono pode contratar; aqui o membro não pode fazer nada a respeito).
  Página acessada direto sem permissão ⇒ `notFound()`.
- Entrada `/comerciante`: sem `vitrine:editar` nem `analytics:ver`, o switch de área some e a
  entrada vai para `/gestao/pedidos`.

**Verificação:** matriz inteira exercitada por API com um usuário de cada papel (criado por
script, já que a tela de equipe é o PR 3).

### 11.3 PR 3 — Tela de equipe ✅ implementado

- **Decisões de 2026-09-12:** flag ligada no `premium` via `prisma/migrate-flag-gestao-equipe.ts`;
  o vínculo do **titular** não é alterável pela tela de equipe (só pelo admin); remover um membro
  **apaga a conta** quando ele não tem vínculo em outro comércio nem é titular.
- **Implementação:** regras em `src/lib/gestao/equipe.ts`; shell movido para o route group
  `src/app/comerciante/(painel)/` (URLs iguais) para `trocar-senha/` ficar fora dele; "Equipe"
  fora da barra inferior do mobile (atalho no Resumo); link "Alterar senha" no cabeçalho.
- Flag de plano **`gestao_equipe`** em `FEATURES_DISPONIVEIS`. Sem ela: página com cadeado e
  **membros não-DONO perdem o acesso** (`getComercioCtx` ignora o vínculo) — o dado do vínculo
  fica guardado e volta a valer se o plano voltar.
- `User.trocarSenha Boolean @default(false)` no schema.
- `/comerciante/gestao/equipe` (permissão `equipe:gerenciar`): lista de membros com papel e status;
  adicionar (nome, e-mail, papel); mudar papel; desativar/reativar; remover; gerar nova senha
  temporária.
- APIs em `/api/comerciante/gestao/equipe` (+ `[id]`):
  - e-mail novo ⇒ cria `User` COMERCIANTE com senha temporária (exibida **uma vez** na resposta) e
    `trocarSenha: true`;
  - e-mail existente com role COMERCIANTE ⇒ só cria o vínculo (sem senha nova);
  - e-mail de ADMIN/SUPER_ADMIN ⇒ 409 (admin já acessa tudo pelo gerenciar);
  - o DONO não pode rebaixar nem remover a si mesmo se for o **único** DONO ativo.
- Troca obrigatória: o `comerciante/layout.tsx` consulta `trocarSenha` e redireciona para
  `/comerciante/trocar-senha` (fora do shell) — sem colocar a flag no JWT, pelo mesmo motivo do
  papel.

**Verificação:** dono adiciona atendente → atendente loga, é forçado a trocar a senha, vê só o
permitido; remover o vínculo corta o acesso na próxima requisição (sem esperar o token expirar).

### 11.4 PR 4 — Multi-loja ✅ implementado

- **Decisões de 2026-09-13:** (1) **funcionário pertence a um único comércio**; só DONO tem
  várias lojas — travado em `violaFuncionarioUnico()` na equipe e na criação de comércio pelo admin;
  (2) trocar de loja leva para a **entrada**; (3) **push por loja fica fora** — a inscrição segue única
  por aparelho (limitação aceita: dono recebe push só da última loja ativada no aparelho).
- Cookie httpOnly **`comercio_ativo`** (nome em módulo sem imports, como o `admin_comercio_id`),
  validado contra os vínculos ativos a cada request; ausente/inválido ⇒ primeiro vínculo.
- `POST /api/comerciante/comercio-ativo` troca o cookie (só para comércio com vínculo) e o
  seletor no shell recarrega a rota atual. Com um vínculo só, o seletor não aparece.
- O `PedidosAlertaProvider` reinicia a linha de base ao trocar de loja (`key` pelo `comercioId`) —
  senão os pedidos da loja nova contariam como "novos".
- Admin: remove o bloqueio de "já possui comércio" no `POST /api/admin/comercios` e no dialog.

**Verificação:** usuário com duas lojas alterna e cada tela mostra só a loja escolhida; cookie
forjado com loja sem vínculo é ignorado; alerta de pedido não dispara ao trocar de loja.

### 11.5 PR 5 — Histórico do pedido ✅ implementado

- **Implementação (2026-09-13):** schema ampliado em relação ao planejado — `origem`
  (`CLIENTE`/`LOJA`/`ADMIN`) e `autorNome` **snapshot**, porque remover membro apaga a conta (PR 3) e
  o histórico perderia o autor. Achado: as rotas liam o status e depois gravavam — com equipe, dois
  aceites simultâneos ou cancelar×aceitar se sobrescreviam; `mudarStatusPedido()` grava condicional
  ao status lido (409). Decisão: página do cliente mostra o **horário de cada etapa** (sem nomes).
- `model PedidoHistorico` (schema do §Fase 1) + `db:push`.
- Gravado na mesma transação de: criação do pedido (`AGUARDANDO`, `userId` null), mudança de status
  pelo painel (`userId` do ctx; admin grava o próprio id) e cancelamento pelo cliente em
  `/api/pedidos/[token]` (`userId` null).
- Card do pedido mostra a linha do tempo ("Aceito por Ana às 19:02").
- Pedidos anteriores ao PR ficam sem histórico — sem backfill (não há como saber quem fez).

**Verificação:** pedido criado → aceito por um atendente → cancelado; os três eventos aparecem
com autor e horário corretos.

---

## 12. Plano de execução — Fase 2 (clientes)

Branch `feat/gestao-fase-2`. Decisões de 2026-09-13 no início da §Fase 2.

### 12.1 PR 1 — Base: model Cliente e vínculo no checkout ✅ implementado

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | `model Cliente` (sem agregados); `Pedido.clienteId String?` (`onDelete: SetNull`) + índice |
| `src/lib/gestao/clientes.ts` (novo) | `normalizarWhatsapp()` (só dígitos, remove o `55` do país) e `vincularCliente(tx, ...)` |
| `src/app/api/pedidos/route.ts` | Na transação do checkout: garante o `Cliente` da loja pelo WhatsApp e grava `clienteId` no pedido |
| `prisma/migrate-clientes-pedidos.ts` (novo) | Backfill: um `Cliente` por loja + WhatsApp a partir dos pedidos existentes (nome do pedido mais recente, `createdAt` = primeiro pedido) e liga `Pedido.clienteId`. Idempotente |

- **Concorrência no checkout:** dois pedidos simultâneos do mesmo WhatsApp novo não podem criar o
  cliente duas vezes nem abortar a transação. `vincularCliente` usa `createMany({ skipDuplicates })`
  (`INSERT ... ON CONFLICT DO NOTHING`, seguro dentro da transação) e depois lê o registro — um
  `upsert` que falhasse por unicidade abortaria a transação inteira do pedido no Postgres.
- **O cliente é criado para toda loja com pedido online**, com ou sem a flag `gestao_clientes`: o
  dado já existe no pedido, e o teaser do plano grátis (PR 3) mostra números reais.
- **Nome:** o cliente nasce com o nome do primeiro pedido e **não é sobrescrito** por pedidos
  seguintes — a loja pode ter corrigido o nome no cadastro.

**Deploy:** `npm run db:push` → `npx tsx prisma/migrate-clientes-pedidos.ts` → publicar.

**Verificação:** checkout cria o cliente e liga o pedido; segundo pedido do mesmo WhatsApp (com
formatação diferente: `+55 (12) 99999-0000`) reusa o cliente; pedidos simultâneos do mesmo número
novo geram um único cliente e nenhum pedido falha; mesmo WhatsApp em outra loja gera outro cliente;
backfill rodado duas vezes não duplica.

### 12.2 PR 2 — Tela de clientes ✅ implementado

- **Decisões de 2026-09-13:** flag ligada no premium (`prisma/migrate-flag-gestao-clientes.ts`);
  aniversário **só dia e mês** (ano fixo 2000 no banco, nunca exibido); "Clientes" no lugar de
  "Produtos" na barra inferior do mobile. **Achados na verificação:** `$queryRaw` devolve `null` para
  `tags` de clientes criados sem tags (coluna sem default) — `COALESCE` na consulta; a busca por
  WhatsApp com "+55" precisava da mesma normalização do cadastro. Busca por nome não ignora acentos.
- Flag `gestao_clientes` e permissões novas `clientes:ver` (dono, gerente, atendente) e
  `clientes:editar` (dono, gerente).
- `/comerciante/gestao/clientes`: lista paginada com busca (nome, WhatsApp), filtros "sumidos há 30+
  dias" e "aniversariantes do mês", filtro por tag, total de pedidos e gasto calculados.
- `/comerciante/gestao/clientes/[id]`: dados, observações, tags, aniversário, pedidos, total gasto,
  ticket médio, itens mais pedidos, botão de WhatsApp.
- Cadastro manual e edição (sem WhatsApp permitido para cliente de balcão); WhatsApp editado
  continua único na loja.
- Menu: item "Clientes" substitui "Produtos" na barra inferior do mobile (conforme §10.3); Produtos
  continua no desktop e no atalho do Resumo.

### 12.3 PR 3 — LGPD e plano grátis ✅ implementado

- **Decisões de 2026-09-14:** exclusão **bloqueada com pedido em andamento**; **dono vê os acessos**
  do admin; **observações do pedido e dos itens são apagadas** na exclusão. **Achados:** o pedido
  também guarda endereço (CEP, rua, número, complemento, referência) — anonimizado junto; a lista
  borrada da prévia usa linhas **fictícias** (blur é CSS, dado real ficaria no HTML); o registro de
  acesso não guarda nome de cliente (reintroduziria dado excluído).
- Aviso no checkout: "Seus dados ficam com {loja} para preparar e entregar o pedido."
- Excluir cliente (`clientes:editar`): apaga o `Cliente` e anonimiza `clienteNome`/`clienteWhats` dos
  pedidos dele numa transação — valores e itens continuam para os relatórios.
- Log de auditoria quando admin acessa clientes via "gerenciar" (model próprio, só leitura no admin).
- Plano sem `gestao_clientes`: página com números reais agregados (clientes no mês, recorrentes) e
  lista borrada com cadeado, no padrão do analytics.

