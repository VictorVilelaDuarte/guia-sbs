# Pedido Online — Plano de Design e Implementação

> **Status:** Planejado — implementação não iniciada. Decisões de produto fechadas
> (2026-06-22). Documento vivo: atualizar ao fim de cada fase com o que foi efetivamente
> construído.
> **Última atualização:** 2026-06-22

Feature de **pedido online dentro do cardápio digital**: o visitante monta um carrinho a partir
do cardápio público de um comércio de alimentação, envia o pedido com seus dados (sem cadastro)
e acompanha o status numa página própria; o comerciante recebe e gerencia os pedidos numa aba
do dashboard. **Sem integração com meios de pagamento** — o pagamento é combinado na entrega/retirada.

A feature é uma **flag de plano paga** (`pedido_online`), forte gancho comercial do SaaS:
"receba pedidos direto pelo seu cardápio, sem comissão de marketplace".

---

## Decisões fechadas (2026-06-22)

1. **Monetização — ✅ feature paga.** Nova flag `pedido_online`, **dependente de `cardapio`**
   (sem cardápio não há o que pedir). O botão "Adicionar"/carrinho só aparece no cardápio
   público quando o plano tem a feature **e** o comerciante ligou `aceitaPedidos`.
2. **Notificação do comerciante — ✅ polling no painel (MVP).** Contador de novos + som +
   título da janela piscando, atualizando a cada ~15s **enquanto a aba está aberta**. Zero infra
   nova. Web Push (notificar com o navegador fechado) fica para a Fase 2.
3. **Entrega — ✅ entrega + retirada, taxa fixa.** Taxa única configurável no `PedidoConfig`;
   `bairrosAtendidos` é uma lista **informativa** no MVP (sem cálculo por zona). Taxa por
   bairro/zona fica para a Fase 2.
4. **Snapshot de itens — ✅ imutável.** O pedido **congela** título, variação e preço no momento
   da compra (model `PedidoItem`). Nunca depende do `Produto` vivo — preço muda, produto pode ser
   excluído. `produtoId` fica só como referência fraca.
5. **Cliente sem cadastro — ✅ acesso por token.** O acompanhamento usa um `token` não-adivinhável
   (`cuid`) na URL `/pedido/[token]`. Não há login nem listagem pública de pedidos.

---

## Modelo de dados

Três entidades novas + dois enums, mais um model de configuração 1:1 com `Comercio` (mesmo padrão
do `HospedagemPerfil`, para não inchar o model principal).

```prisma
enum PedidoStatus {
  AGUARDANDO    // recém-criado, comerciante ainda não agiu
  ACEITO        // confirmado pela loja
  EM_PREPARO
  PRONTO        // retirada: pronto p/ buscar | entrega: pronto p/ sair
  SAIU_ENTREGA  // só entrega
  CONCLUIDO     // entregue / retirado (terminal)
  RECUSADO      // loja recusou (terminal)
  CANCELADO     // cliente ou loja cancelou (terminal)
}

enum TipoEntrega {
  ENTREGA
  RETIRADA
}

model Pedido {
  id            String       @id @default(cuid())
  token         String       @unique @default(cuid())  // acompanhamento público
  numero        Int          // curto e amigável, sequencial POR comércio (#012)
  comercioId    String
  status        PedidoStatus @default(AGUARDANDO)
  tipoEntrega   TipoEntrega

  // cliente (sem login)
  clienteNome   String
  clienteWhats  String

  // endereço (só ENTREGA — snapshot textual, não reusa campos do Comercio)
  cep           String?
  endereco      String?
  numeroEnd     String?
  bairro        String?
  complemento   String?
  referencia    String?

  formaPagamento String                 // key de FORMAS_PAGAMENTO (src/lib/hospedagem.ts)
  trocoPara      Float?                  // só quando formaPagamento = "dinheiro"
  observacoes    String?  @db.Text

  subtotal      Float                    // recalculado no servidor
  taxaEntrega   Float    @default(0)     // 0 em RETIRADA
  total         Float

  motivoCancelamento String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  comercio Comercio     @relation(fields: [comercioId], references: [id], onDelete: Cascade)
  itens    PedidoItem[]

  @@unique([comercioId, numero])
  @@index([comercioId, status, createdAt])
  @@map("pedidos")
}

model PedidoItem {
  id           String  @id @default(cuid())
  pedidoId     String
  produtoId    String?            // referência fraca (sem FK forte) — só rastreio
  titulo       String             // snapshot
  variacaoNome String?            // snapshot da variação escolhida
  precoUnit    Float              // snapshot do preço unitário
  quantidade   Int
  observacao   String?

  pedido Pedido @relation(fields: [pedidoId], references: [id], onDelete: Cascade)

  @@map("pedido_itens")
}

model PedidoConfig {
  id               String   @id @default(cuid())
  comercioId       String   @unique
  aceitaPedidos    Boolean  @default(false)  // liga/desliga, independente de aberto/fechado
  entregaAtiva     Boolean  @default(true)
  retiradaAtiva    Boolean  @default(true)
  pedidoMinimo     Float    @default(0)       // mínimo para ENTREGA
  taxaEntrega      Float    @default(0)       // taxa fixa (MVP)
  tempoPreparoMin  Int?                        // "~40 min" exibido ao cliente
  formasPagamento  String[]                    // subconjunto de FORMAS_PAGAMENTO
  bairrosAtendidos String[]                    // informativo no MVP
  proximoNumero    Int      @default(1)        // contador p/ `numero` (incrementado em transação)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  comercio Comercio @relation(fields: [comercioId], references: [id], onDelete: Cascade)

  @@map("pedido_configs")
}
```

Relações a adicionar em `Comercio`:

```prisma
  pedidos      Pedido[]
  pedidoConfig PedidoConfig?
```

> **Numeração:** `numero` é sequencial **por comércio** (amigável: #001, #002). Sai de
> `PedidoConfig.proximoNumero`, lido-e-incrementado **dentro da transação** que cria o pedido
> (`prisma.$transaction`) para evitar corrida. `@@unique([comercioId, numero])` é a rede de
> segurança.

> **`numeroEnd`** (e não `numero`) no `Pedido` para o número do endereço, evitando colisão com o
> campo `numero` do pedido.

---

## Máquina de estados

O status **não** é campo livre — a API só aceita transições legais:

```
AGUARDANDO   → ACEITO | RECUSADO | CANCELADO
ACEITO       → EM_PREPARO | CANCELADO
EM_PREPARO   → PRONTO | CANCELADO
PRONTO       → SAIU_ENTREGA (entrega) | CONCLUIDO (retirada) | CANCELADO
SAIU_ENTREGA → CONCLUIDO | CANCELADO
CONCLUIDO / RECUSADO / CANCELADO = terminais
```

- **Cliente** só pode cancelar enquanto `AGUARDANDO` (antes de a loja aceitar).
- **Loja** que recusa/cancela deve informar `motivoCancelamento`.
- A tabela de transições mora em `src/lib/pedidos.ts` (`TRANSICOES`, `podeTransicionar(de, para)`),
  usada **tanto** na API do comerciante (validação) **quanto** na UI (habilitar botões).

---

## Fluxo do cliente

1. **Cardápio** (`CardapioView`): cada item ganha botão "Adicionar"; abre o `ProdutoBottomSheet`
   existente com seletor de **quantidade + variação + observação**.
2. **Carrinho** em `localStorage`, **isolado por slug** (nunca misturar itens de comércios
   diferentes). Barra fixa: "🛒 3 itens · R$ 48,00 · Ver carrinho".
3. **Checkout** (rota `/vitrine/[slug]/cardapio/checkout`):
   - Tipo: **Entrega** ou **Retirada** (conforme `entregaAtiva`/`retiradaAtiva`).
   - Nome + WhatsApp.
   - Se entrega: endereço via `EnderecoInput`/ViaCEP (CEP, logradouro, número, bairro,
     complemento, referência).
   - Forma de pagamento (subconjunto configurado); se **dinheiro**, "troco para quanto?".
   - Observações gerais.
   - Resumo: subtotal + taxa (se entrega) + total; bloqueio se abaixo do `pedidoMinimo`.
4. **Envio** → `POST /api/pedidos` revalida tudo no servidor → cria pedido → **abre
   `/pedido/[token]` em nova aba**.
5. **Acompanhamento** (`/pedido/[token]`): timeline de status com **polling ~20s**, dados do
   pedido, botão "Falar no WhatsApp" com a loja e botão "Cancelar" enquanto `AGUARDANDO`.

---

## Fluxo do comerciante

1. Aba **Pedidos** no dashboard, gated por `pedido_online`.
2. Visão por status: **Novos** (`AGUARDANDO`) · **Em andamento** (`ACEITO`…`SAIU_ENTREGA`) ·
   **Concluídos/Encerrados**.
3. Card do pedido: número, itens, cliente, endereço/retirada, pagamento + troco, total, tempo
   decorrido. Botões avançam o status conforme a máquina de estados.
4. **Configuração** (sub-tela `pedido-config-form`): liga/desliga "aceitar pedidos", entrega/
   retirada, taxa fixa, pedido mínimo, tempo de preparo, formas aceitas, bairros atendidos.

---

## Regras de negócio

1. **Revalidação no servidor (anti-tamper).** O `POST /api/pedidos` ignora preços enviados pelo
   cliente: recarrega cada `Produto`/variação do banco, recalcula `subtotal`/`total`, rejeita
   itens `disponivel: false` ou inexistentes.
2. **Loja precisa estar aceitando.** Exige `PedidoConfig.aceitaPedidos === true`. (Bloqueio por
   "fechada agora" é decisão de Fase 2 — agendamento.)
3. **Pedido mínimo.** Bloqueia checkout de **entrega** abaixo de `pedidoMinimo`.
4. **Taxa de entrega.** Fixa; soma no total apenas quando `tipoEntrega === ENTREGA`.
5. **Snapshot imutável.** Itens e preços ficam congelados no pedido; alterar o cardápio depois
   não afeta pedidos passados.
6. **Troco.** Se `dinheiro`, perguntar "troco para quanto?" (opcional); se informado, validar
   `trocoPara >= total`.
7. **PII mínima.** Guardamos só nome, WhatsApp e endereço (necessários à entrega). Sem conta de
   cliente, sem dados de pagamento.
8. **Token é a única credencial.** `token` (`cuid`) dá acesso ao pedido; não há rota que liste
   pedidos publicamente.
9. **Feature flag dupla.** Botões de pedido no cardápio aparecem só com `pedido_online` no plano
   **e** `aceitaPedidos` ligado pelo comerciante.

---

## Notificação do comerciante (MVP: polling)

Não há push/realtime/e-mail no projeto. No MVP:

- O `pedidos-manager` faz **polling** em `GET /api/comerciante/pedidos` a cada ~15s enquanto a aba
  está aberta.
- Pedido novo dispara **som** + **contador** na aba + **título da janela piscando**.
- Limitação aceita: depende do comerciante manter o painel aberto.

**Fase 2 — Web Push** (service worker + VAPID) para notificar com o navegador fechado, tornando a
feature plenamente utilizável num restaurante. **WhatsApp automático não é viável** sem API
oficial; o máximo é um `wa.me` pré-preenchido que o **cliente** dispara como espelho — não
substitui o painel como fonte de verdade.

---

## Arquitetura de arquivos (blueprint da Fase 1)

Backbone primeiro (dados → libs → APIs), UI depois — cada camada nasce testável.

**1. Dados & libs**
- `prisma/schema.prisma` — enums `PedidoStatus`/`TipoEntrega`, models `Pedido`/`PedidoItem`/
  `PedidoConfig`, relações em `Comercio`. `npm run db:push`.
- `src/lib/plan-features.ts` — adicionar `pedido_online` em `FEATURES_DISPONIVEIS`.
- `src/lib/pedidos.ts` (novo) — labels/cores de status, máquina de estados (`TRANSICOES`,
  `podeTransicionar`), cálculo de total. Reusa `FORMAS_PAGAMENTO` de `src/lib/hospedagem.ts`
  (importar, não duplicar).

**2. APIs**
- `POST /api/pedidos` — revalida itens/preços, transação com `proximoNumero`, retorna `token`.
- `GET/PATCH /api/pedidos/[token]` — status público + cancelar (cliente, só `AGUARDANDO`).
- `GET /api/comerciante/pedidos` — lista para polling (guard `COMERCIANTE`).
- `PATCH /api/comerciante/pedidos/[id]` — muda status (valida transição via `podeTransicionar`).
- `PUT /api/comerciante/pedido-config` — upsert da config.

**3. UI cliente**
- `src/lib/carrinho.ts` — hook `useCarrinho(slug)` sobre `localStorage`, isolado por slug.
- Editar `src/components/public/cardapio-view.tsx` + `cardapio/produto-bottom-sheet.tsx` —
  adicionar ao carrinho (qtd/variação/obs) + barra fixa do carrinho. Gating via props vindas de
  `cardapio/page.tsx` (`aceitaPedidos`, feature, config).
- `src/app/(public)/vitrine/[slug]/cardapio/checkout/page.tsx` — reusa `EnderecoInput`/ViaCEP.
- `src/app/pedido/[token]/page.tsx` — timeline + polling ~20s. **Fora** do route group
  `(public)/` para não herdar `BottomNav`/`Footer`.

**4. UI comerciante**
- `src/components/comerciante/pedidos-manager.tsx` — visão por status + polling + som + contador.
- `src/components/comerciante/pedido-config-form.tsx` — configuração.
- Editar `src/components/comerciante/dashboard-tabs.tsx` — aba
  `{ id: "pedidos", label: "Pedidos", feature: "pedido_online" }`.
- Editar `src/app/comerciante/dashboard/page.tsx` — incluir `pedidoConfig` (e contagem de novos)
  na query.

**5. Analytics (opcional na Fase 1)**
- Novos tipos `pedido_iniciado` / `pedido_enviado` no comentário do `AnalyticsEvent` + tracking no
  checkout (reforça a aba Analytics e a venda).

---

## Gating no cardápio público

`vitrine/[slug]/cardapio/page.tsx` passa para o `CardapioView`:
- `temFeature(plan.features, "pedido_online")` e
- `pedidoConfig.aceitaPedidos`.

Só com ambos `true` o cardápio renderiza os botões "Adicionar" e a barra de carrinho. Sem isso, o
cardápio segue exatamente como hoje (somente leitura).

---

## Faseamento

### Fase 1 — Pedido ponta a ponta (MVP)
Schema + carrinho + checkout + `POST /api/pedidos` + página de acompanhamento + aba Pedidos com
polling + config básica. **Critério de pronto:** cliente monta carrinho, envia pedido com
entrega/retirada e taxa fixa, acompanha o status em `/pedido/[token]`; comerciante recebe (com som
no painel), avança o status pela máquina de estados, e o cliente vê a mudança.

### Fase 2 — Robustez operacional
Web Push para o comerciante; bloqueio/agendamento quando a loja está fechada; taxa de entrega por
bairro/zona.

### Fase 3 — Pós-venda e recorrência
Histórico/relatório de pedidos no dashboard; integração com a aba Analytics; "repetir pedido" para
o cliente.

---

## Referências no código existente

- `src/components/public/cardapio-view.tsx` — cardápio público (Client Component); ponto de
  entrada do carrinho.
- `src/components/public/cardapio/produto-bottom-sheet.tsx` — sheet de item; onde entra
  quantidade/variação/observação.
- `src/app/(public)/vitrine/[slug]/cardapio/page.tsx` — rota do cardápio; passa o gating de pedido.
- `src/lib/hospedagem.ts` — `FORMAS_PAGAMENTO` (pix/dinheiro/crédito/débito/transferência) a reusar.
- `src/lib/plan-features.ts` — `FEATURES_DISPONIVEIS`, `temFeature`; onde entra `pedido_online`.
- `src/components/comerciante/dashboard-tabs.tsx` — padrão de aba gated por `feature`/`categoria`.
- `src/components/comerciante/hospedagem-manager.tsx` + `hospedagem/perfil-form.tsx` — padrão de
  manager + form de config 1:1 (modelo para `pedidos-manager` + `pedido-config-form`).
- `src/components/comerciante/endereco-input.tsx` — input de endereço com CEP/ViaCEP/mapa, reusado
  no checkout.
