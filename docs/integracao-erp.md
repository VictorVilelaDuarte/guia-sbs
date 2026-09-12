# Integração Guia SBS ↔ Sistema de Gestão (ERP)

> **⚠️ ARQUIVADO (2026-09-12):** não haverá ERP parceiro. A gestão será construída dentro deste
> projeto — ver [`modulo-gestao.md`](modulo-gestao.md). Nada deste documento deve ser
> implementado (inclusive o campo `catalogoOrigem`). Mantido só como referência de desenho caso um
> dia seja preciso expor API para terceiros (auth de máquina, webhook HMAC, reconciliação).

> **Status original:** proposta de arquitetura — nada implementado. Documento de trabalho **compartilhado
> entre as duas equipes**; qualquer mudança de contrato se decide aqui antes de virar código.
> **Versão do contrato:** `v1` (rascunho) · **Data:** 2026-09-01

Integração entre o **Guia SBS** (guia digital + vitrine + pedido online, Next.js/Postgres) e o
**ERP** (sistema de gestão de loja, servidor próprio com API HTTP, multi-loja numa base única).

Premissas confirmadas com o time do ERP:

| Pergunta | Resposta |
|---|---|
| Onde roda | **Servidor** (não é instalado na loja) |
| Tem API HTTP | **Sim** |
| Arquitetura de lojas | **Multi-loja numa base só** |
| Catálogo tem variações de preço e fotos | **Sim** |
| Modelo comercial | Produtos **vendidos juntos ou separados** |

A última resposta é a mais determinante do desenho: como o guia continua sendo vendido sozinho
para lojas **sem** ERP, ele **não pode** delegar o catálogo incondicionalmente. A integração é um
**modo de operação por loja**, não uma troca de arquitetura.

---

## 1. Princípio: um dono por domínio

O problema real não é "quem chama quem" — é que hoje os dois sistemas se consideram donos de
produto, preço e pedido. Enquanto isso não for resolvido, qualquer transporte produz divergência.

| Domínio | Dono (fonte de verdade) | O outro lado |
|---|---|---|
| Produto, categoria, preço, variação, foto | **ERP** (quando a loja é integrada) | Guia mantém **cópia local somente-leitura**, usada para renderizar |
| Estoque e disponibilidade | **ERP** | Guia reflete; item sem estoque some do cardápio |
| Pedido online: criação, cliente, endereço, valores | **Guia** | ERP recebe cópia e opera |
| Status do pedido | **Compartilhado**, árbitro no guia (`src/lib/pedidos.ts`) | ERP aplica transições pela API, nunca escreve status direto |
| Vitrine, SEO, fotos do local, horários, analytics, taxas de entrega | **Guia** | ERP não participa |
| Cadastro fiscal, compras, financeiro, PDV | **ERP** | Guia não participa |

**Regra derivada:** quando `Comercio.catalogoOrigem = ERP`, as abas Cardápio/Produtos/Serviços do
dashboard do guia ficam **somente leitura**, com aviso "gerenciado pelo seu sistema de gestão".
Quando `LOCAL` (loja sem ERP), tudo segue como hoje.

---

## 2. Topologia

Bidirecional, os dois lados falando HTTP de saída — nenhum dos dois precisa abrir porta para o
outro além do HTTPS público que já têm.

```
                 catálogo (push)  ─────────────────────────►
   ERP  ──────────────────────────────────────────────►  GUIA
  (servidor)   status do pedido (PATCH) ────────────────►
       ◄──────────────────────────────────────────────
                 webhook: pedido.criado (assinado)
       ◄──────────────────────────────────────────────
                 reconciliação: GET /pedidos?desde=  (pull do ERP, rede de segurança)
```

1. **Catálogo — ERP → Guia (push).** A cada alteração relevante (preço, disponibilidade, item
   novo, foto), o ERP envia. Um envio **completo** diário serve de rede de segurança.
2. **Pedido novo — Guia → ERP (webhook).** O guia dispara `pedido.criado` assinado para a URL
   cadastrada. Latência de segundos, sem polling.
3. **Reconciliação — ERP → Guia (pull).** O ERP chama `GET /pedidos?desde=<ISO>` a cada 1–5 min.
   **Não é opcional:** webhook perdido (deploy, timeout, indisponibilidade) sem reconciliação
   significa pedido que ninguém viu. O guia já tem esse padrão incremental em
   `/api/comerciante/pedidos`.
4. **Status — ERP → Guia (PATCH).** A loja opera no ERP; cada avanço vira uma transição validada
   pela máquina de estados do guia, e o cliente vê em até 20 s (o acompanhamento já faz polling).

> As páginas públicas de vitrine e cardápio **não têm ISR** (são renderizadas por request), então
> uma atualização de preço vinda do ERP aparece na próxima visita, sem espera. Só home, `/eventos`,
> `/sao-bento-do-sapucai` e o sitemap são cacheados — nenhum deles mostra preço de item.

---

## 3. Identidade e vínculo entre lojas

O ERP é multi-loja e o guia é multi-comércio: é preciso um mapa explícito entre os dois.

**Models novos no guia:**

```prisma
// A empresa parceira (o ERP como integrador). Uma linha só, hoje.
model IntegracaoParceiro {
  id          String   @id @default(cuid())
  nome        String                     // "Sistema de Gestão X"
  webhookUrl  String?                    // destino dos eventos do guia
  webhookSecret String?                  // HMAC-SHA256 dos webhooks
  ativo       Boolean  @default(true)
  tokens      IntegracaoToken[]
  vinculos    IntegracaoVinculo[]
}

// Credencial de máquina. Guarda só o HASH da chave (bcrypt), nunca a chave.
model IntegracaoToken {
  id          String    @id @default(cuid())
  parceiroId  String
  nome        String                     // "produção", "homologação"
  hash        String
  prefixo     String                     // 8 primeiros chars, para exibir/rastrear
  escopos     String[]                   // catalogo:write, pedidos:read, pedidos:write
  ultimoUsoEm DateTime?
  revogadoEm  DateTime?
  createdAt   DateTime  @default(now())
}

// O mapa loja-do-ERP ↔ comércio-do-guia. É o que autoriza cada request.
model IntegracaoVinculo {
  id            String   @id @default(cuid())
  parceiroId    String
  comercioId    String   @unique
  lojaExternaId String                   // id da loja no ERP
  ativo         Boolean  @default(true)
  vinculadoEm   DateTime @default(now())

  @@unique([parceiroId, lojaExternaId])
}
```

**Como o vínculo nasce (pareamento por código):** o lojista abre a aba Integrações no painel do
guia e gera um **código de pareamento** de 8 caracteres, válido por 15 min. No ERP, ele cola o
código na tela da loja dele. O ERP chama `POST /api/integracao/v1/parear` com o código e o
`lojaExternaId`; o guia cria o `IntegracaoVinculo` e responde com o `comercioId`.

Isso evita o pior cenário de multi-loja: alguém digitando o id errado e o cardápio de uma pizzaria
aparecer na vitrine de outra. **Nenhum request pode aceitar `comercioId` cru vindo do parceiro** —
a loja é sempre resolvida pelo vínculo, a partir do `lojaExternaId` do payload.

---

## 4. Contrato de dados (`v1`)

Regras gerais:

- Base: `POST|PUT|PATCH|GET https://<guia>/api/integracao/v1/...`
- Auth: `Authorization: Bearer <chave>` (a chave do `IntegracaoToken`).
- **Dinheiro sempre em centavos inteiros** (`precoCentavos: 4990`). O guia guarda `Float`
  internamente e converte na borda — inteiro no contrato elimina erro de arredondamento entre
  linguagens diferentes.
- Datas em ISO 8601 com offset.
- Toda escrita aceita `Idempotency-Key` (uuid); repetição da mesma chave devolve o resultado
  anterior, sem reprocessar.
- Erros: `{ "erro": "codigo_estavel", "mensagem": "texto", "detalhes": [...] }` — o **código** é
  contrato, a mensagem não.
- Nenhum dos lados expõe seu schema interno: o payload abaixo é um DTO, e cada lado traduz.

### 4.1 Catálogo — `PUT /catalogo`

Envia a projeção do cardápio/catálogo de **uma loja**.

```json
{
  "lojaExternaId": "0042",
  "modo": "completo",
  "atualizadoEm": "2026-09-01T14:03:22-03:00",
  "categorias": [
    { "externalId": "CAT-01", "nome": "Pizzas salgadas", "destino": "cardapio", "ordem": 1 },
    { "externalId": "CAT-09", "nome": "Bebidas",         "destino": "cardapio", "ordem": 2 }
  ],
  "itens": [
    {
      "externalId": "PRD-1181",
      "categoriaExternalId": "CAT-01",
      "tipo": "PRODUTO",
      "titulo": "Pizza Calabresa",
      "descricao": "Molho, mussarela, calabresa e cebola",
      "precoCentavos": null,
      "disponivel": true,
      "controlaEstoque": false,
      "estoque": null,
      "publicarNoGuia": true,
      "fotos": ["https://erp.exemplo.com/img/1181-a.jpg"],
      "variacoes": [
        { "externalId": "PRD-1181-M", "nome": "Média",  "precoCentavos": 5900, "ordem": 0 },
        { "externalId": "PRD-1181-G", "nome": "Grande", "precoCentavos": 7400, "ordem": 1 }
      ]
    }
  ]
}
```

- `modo: "completo"` — o que não vier no payload é marcado **indisponível** (não apagado: pedidos
  antigos guardam snapshot, e apagar destruiria histórico e ordenação manual).
  `modo: "parcial"` — só faz upsert do que veio.
- `destino`: `"cardapio"` (entra no cardápio digital, é o que pode ser pedido online) ou
  `"catalogo"` (vitrine de produtos/serviços, sem pedido). No guia essa é a diferença entre ter
  ou não `categoriaCardapioId` — hoje um item vive num ou noutro, nunca nos dois.
- `precoCentavos: null` é válido **apenas** quando há `variacoes` (é como o guia já modela: preço
  no item **ou** nas variações).
- `publicarNoGuia: false` deixa o item fora da vitrine sem apagá-lo — o ERP tem itens (insumos,
  serviços internos) que não fazem sentido em público.
- Limite: **500 itens por request**. Lotes maiores são paginados pelo ERP (o guia roda em
  serverless, com teto de tempo por request).

**Resposta:** `{ "recebidos": 312, "criados": 4, "atualizados": 308, "ignorados": [ {externalId, motivo} ] }`

### 4.2 Alteração pontual — `PATCH /itens/{externalId}`

O caso frequente do dia a dia (acabou o item, mudou o preço) não deve exigir o catálogo inteiro:

```json
{ "lojaExternaId": "0042", "disponivel": false, "estoque": 0 }
```

### 4.3 Pedidos — `GET /pedidos?lojaExternaId=0042&desde=<ISO>&limite=100`

Retorna pedidos criados **ou atualizados** depois de `desde`, ordenados por `atualizadoEm`.

```json
[{
  "id": "clx8h2k9v0001",
  "numero": 128,
  "status": "AGUARDANDO",
  "tipoEntrega": "ENTREGA",
  "criadoEm": "2026-09-01T19:12:04-03:00",
  "cliente": { "nome": "Ana Souza", "whatsapp": "12991234567" },
  "entrega": {
    "cep": "12490-000", "logradouro": "Rua XV", "numero": "88",
    "complemento": null, "bairro": "Centro", "referencia": "portão azul",
    "taxaCentavos": 800
  },
  "pagamento": { "forma": "dinheiro", "trocoParaCentavos": 10000 },
  "observacoes": "sem cebola",
  "itens": [{
    "produtoExternalId": "PRD-1181",
    "titulo": "Pizza Calabresa",
    "variacaoNome": "Grande",
    "precoUnitCentavos": 7400,
    "quantidade": 1,
    "observacao": null
  }],
  "subtotalCentavos": 7400,
  "taxaEntregaCentavos": 800,
  "totalCentavos": 8200
}]
```

> **Autoridade de preço:** o pedido carrega o preço **congelado no momento da compra** (o guia já
> funciona assim: recalcula tudo no servidor e grava snapshot em `PedidoItem`). Se o ERP encontrar
> preço diferente do atual dele, **vale o do pedido** — o cliente viu aquele valor na tela. A
> diferença é problema comercial da loja, nunca correção silenciosa.

### 4.4 Status — `PATCH /pedidos/{id}`

```json
{ "lojaExternaId": "0042", "status": "EM_PREPARO", "motivoCancelamento": null }
```

Transições válidas (a mesma máquina que a UI do guia usa; transição ilegal ⇒ **409**):

```
AGUARDANDO   → ACEITO | RECUSADO | CANCELADO
ACEITO       → EM_PREPARO | CANCELADO
EM_PREPARO   → PRONTO | CANCELADO
PRONTO       → SAIU_ENTREGA (entrega) | CONCLUIDO (retirada) | CANCELADO
SAIU_ENTREGA → CONCLUIDO | CANCELADO
CONCLUIDO / RECUSADO / CANCELADO = terminais
```
`RECUSADO` e `CANCELADO` exigem `motivoCancelamento`.

### 4.5 Webhook — Guia → ERP

`POST <webhookUrl>` com cabeçalhos:

```
X-Guia-Evento: pedido.criado | pedido.cancelado_pelo_cliente | pedido.status_alterado
X-Guia-Entrega: <uuid>            # mesmo id em todas as retentativas
X-Guia-Timestamp: <epoch>
X-Guia-Assinatura: sha256=<HMAC(webhookSecret, timestamp + "." + corpo)>
```

- O corpo é o mesmo objeto do §4.3.
- O ERP responde **2xx em até 5 s**; qualquer outra coisa entra em retentativa com backoff
  (30 s, 2 min, 10 min, 1 h, 6 h) e depois desiste — a reconciliação do §2.3 cobre o resto.
- Rejeitar requisição com `timestamp` mais velho que 5 min (anti-replay).
- O ERP deve tratar **entrega duplicada** como normal: desduplicar por `X-Guia-Entrega` ou pelo
  `id` do pedido.

---

## 5. Estoque — o ponto que exige acordo explícito

Hoje o guia **não tem estoque nenhum**: só o booleano `Produto.disponivel`, ligado à mão pelo
lojista. Com o ERP como dono, entram `estoque Int?` e `controlaEstoque Boolean`, e a regra
"zerou, some do cardápio" passa a valer sozinha. É um dos maiores ganhos práticos da integração.

**O que a integração não resolve na v1:** o guia **não reserva estoque** no checkout. Entre o
cliente enviar o pedido e o ERP baixar a quantidade existe uma janela em que dá para vender o
último item duas vezes.

Opções, em ordem de custo:

1. **v1 — aceitar a janela.** O ERP empurra a baixa imediatamente (`PATCH /itens`) e o pedido que
   sobrar é recusado pela loja com motivo. É como o guia já opera hoje, e como a maioria dos
   delivery locais opera. **Recomendado para começar.**
2. **v2 — reserva síncrona.** No checkout, o guia chama `POST /reservas` no ERP e só cria o pedido
   se houver saldo. Elimina a venda dupla, mas acopla o checkout à latência e ao uptime do ERP:
   se ele cair, ninguém consegue pedir. Só vale se aparecer volume que justifique.

Decidir isso agora, e por escrito, evita a discussão no meio da implementação.

---

## 6. Fotos — o guia re-hospeda, não faz hotlink

O ERP manda a URL; o guia **baixa a imagem, grava no Supabase Storage** e passa a servir a URL
própria, guardando um hash do conteúdo para não rebaixar o que não mudou.

Motivo concreto: `next.config.ts` só autoriza o host do Supabase em `images.remotePatterns` — uma
URL externa nem renderiza pelo `next/image`. Fora isso, a vitrine pública não pode depender do
uptime, do CORS ou da política de hotlink do servidor do ERP.

---

## 7. Mudanças no guia

**Schema** (além dos três models do §3):

```prisma
model Comercio {
  catalogoOrigem  CatalogoOrigem @default(LOCAL)   // LOCAL | ERP
  // + vinculo IntegracaoVinculo?
}

model Produto {
  externalId      String?
  estoque         Int?
  controlaEstoque Boolean @default(false)
  publicado       Boolean @default(true)
  @@unique([comercioId, externalId])
}

model CardapioCategoria { externalId String?  @@unique([comercioId, externalId]) }
model CatalogoCategoria { externalId String?  @@unique([comercioId, externalId]) }
model Pedido           { externalId String?; sincronizadoEm DateTime? }

model WebhookEntrega {   // fila/auditoria de entregas
  id String @id @default(cuid())
  parceiroId String
  evento String
  pedidoId String?
  payload Json
  tentativas Int @default(0)
  proximaTentativa DateTime?
  entregueEm DateTime?
  ultimoErro String?
}
```

**Código:**

1. `src/lib/integracao-ctx.ts` — `getIntegracaoCtx(req)`: valida `Bearer`, resolve
   parceiro + escopos, resolve o comércio pelo `lojaExternaId`. É o irmão de máquina do
   `getComercioCtx()`, e **toda** rota de integração passa por ele.
2. `src/app/api/integracao/v1/*` — as rotas do §4.
3. `src/lib/integracao/catalogo.ts` — upsert em lote por `externalId`, ingestão de fotos,
   marcação de ausentes no `modo: completo`.
4. `src/lib/integracao/webhook.ts` — assinatura HMAC, envio, retentativa com backoff.
   Na Vercel isso pede um **Vercel Cron** (a cada minuto) processando `WebhookEntrega`
   pendente — hoje o projeto não tem nenhum job agendado.
5. Gating de UI: `catalogoOrigem === "ERP"` deixa as abas de catálogo em leitura, com link
   "editar no seu sistema de gestão".
6. Aba **Integrações** no dashboard: gerar código de pareamento, ver status da última
   sincronização, desconectar.

**Fora de escopo desta integração:** pagamento, fiscal, financeiro, clientes/CRM. O pedido do guia
não tem pagamento online — quem cobra é a loja, presencialmente.

---

## 8. Adoção: o que acontece na primeira conexão

O caso mais delicado, e o que costuma dar errado numa integração de catálogo: a loja **já tem**
itens cadastrados no guia quando liga a integração.

Fluxo proposto:

1. Pareamento (§3) — a loja passa a `catalogoOrigem = ERP`, mas o catálogo **ainda não** é
   substituído.
2. O ERP envia o primeiro `PUT /catalogo` com `modo: "completo"` e **`simular: true`**.
3. O guia responde com um **relatório de conciliação**: quais itens casam por título, quais são
   novos, quais existem só no guia (fotos, descrições e destaques que o lojista escreveu à mão e
   vai perder).
4. O lojista confirma no painel; só então o guia aplica, preservando `destaque`, fotos próprias e
   ordenação onde o casamento foi confirmado.

Sem esse passo, a primeira sincronização apaga o trabalho de vitrine que o lojista fez — e a
percepção é de que "a integração quebrou meu cardápio".

---

## 9. Faseamento

| Fase | Escopo | Critério de pronto |
|---|---|---|
| **0 — Contrato** | Este documento revisado e aceito pelos dois lados; ambiente de homologação de cada lado | Os dois times assinam o `v1`; nada de código antes |
| **1 — Catálogo (ERP → Guia)** | Auth de máquina, pareamento, `PUT /catalogo`, `PATCH /itens`, ingestão de fotos, gating de UI, conciliação do §8 | O lojista cadastra a pizza **só no ERP** e ela aparece na vitrine com preço, variações e foto |
| **2 — Pedidos (Guia → ERP)** | Webhook assinado + reconciliação + `PATCH /pedidos` | Pedido feito no cardápio aparece no ERP em segundos; a loja avança o status no ERP e o cliente vê em `/pedido/[token]` |
| **3 — Estoque e robustez** | `estoque`/`controlaEstoque`, painel de integração (logs, reenvio), alarme de sincronização parada | Item que zera no ERP some do cardápio sem ninguém tocar em nada |
| **4 — Opcional** | Reserva síncrona (§5.2), promoções/happy hour, catálogo do ERP alimentando o `/catalogo` da vitrine | Conforme demanda real |

Cada fase entrega valor sozinha. Se a Fase 1 for a única que existir, o ganho principal — cadastrar
num lugar só — já está entregue.

---

## 10. O que fica fora e por quê

- **Sincronizar banco com banco (diário ou não).** Preço e disponibilidade defasados em produto de
  delivery são falha visível para o cliente final, o pedido do guia congela snapshot do preço
  errado, e o acoplamento força as duas equipes a coordenar migration. Batch só serve para dado que
  ninguém olha em tempo real — não é o caso de nenhum dado aqui.
- **Fundir os dois sistemas num só.** São produtos com ciclos diferentes: SaaS público multi-loja
  com SEO e vitrine de um lado; gestão interna com PDV, estoque e fiscal do outro. Fundir cria um
  monolito com dois donos e um deploy — cada publicação do guia passa a poder derrubar o caixa da
  loja. O que vale unificar é o **contrato de dados** (este documento) e, se fizer sentido
  comercial, a **oferta**; não o repositório.
- **O guia consumir a API do ERP a cada visita.** A vitrine pública ficaria refém do uptime e da
  latência do ERP, e o guia perderia a capacidade de servir loja sem ERP. O guia lê sempre o
  próprio Postgres; o ERP mantém esse Postgres atualizado.

---

## 11. Pendências para a próxima conversa

1. **Reserva de estoque:** aceitar a janela da v1 (recomendado) ou já desenhar a reserva síncrona?
2. **Granularidade do push:** o ERP consegue disparar por evento (mudou o preço → envia) ou só um
   lote periódico? Muda a frequência do envio completo.
3. **Ids do ERP:** `externalId` é estável ao longo da vida do produto (não muda em edição, não é
   reaproveitado após exclusão)?
4. **Homologação:** cada lado precisa de um ambiente separado com chave própria — quem hospeda o
   do ERP?
5. **Multi-loja no guia:** um lojista com duas lojas no ERP terá dois `Comercio` no guia, certo?
   O vínculo é 1:1 por design.
6. **Serviços com agendamento** (se o ERP tiver): o guia hoje só expõe serviço como vitrine, sem
   horário nem reserva.
