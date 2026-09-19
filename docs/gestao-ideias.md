# Módulo de Gestão — Banco de ideias

> **Status:** ideias levantadas em 2026-09-15, depois da Fase 3 (vendas, PDV, comandas e relatórios)
> ir para produção. **Nada aqui está decidido nem desenhado.** Cada ideia vira plano de execução no
> [`docs/modulo-gestao.md`](modulo-gestao.md) só quando for escolhida — com as decisões abertas
> respondidas antes de implementar.

Todas as ideias partem do que já existe no módulo: equipe e papéis (Fase 1), clientes (Fase 2),
pedidos online, PDV com venda rápida e comandas, produção, pagamentos múltiplos e relatórios (Fase 3).

**Esforço:** **P** = um PR · **M** = dois ou três PRs · **G** = uma fase inteira.

---

## Prioridade sugerida

| # | Ideia | Esforço | Por que primeiro |
|---|---|:-:|---|
| 1 | [Controle de caixa por turno](#11-controle-de-caixa-por-turno) | P | Fecha o ciclo financeiro que a Fase 3 começou |
| 2 | [Adicionais e complementos](#21-adicionais-e-complementos) | M | Restaurante e lanchonete improvisam na observação; relatórios e estoque perdem precisão |
| 3 | [Relatório "quanto o guia me trouxe"](#51-relatório-quanto-o-guia-me-trouxe) | P | Melhor argumento contra o cancelamento do plano pago |
| 4 | [Alertas antifraude para o dono](#41-alertas-antifraude-para-o-dono) | P | Dono passa a confiar em deixar a equipe operar sozinha |
| 5 | [Fidelidade digital](#31-fidelidade-digital) | M | Usa o cadastro de clientes para trazer o cliente de volta |

Depois dessas, a **Fase 4 (estoque)** do plano principal — adicionais e custo do produto influenciam
como o estoque vai ser desenhado.

---

## 1. Fechar o ciclo do dinheiro

### 1.1 Controle de caixa por turno
**Esforço:** P · **Depende de:** PDV e `PedidoPagamento` (prontos)

- **Problema:** o relatório diz quanto *deveria* haver na gaveta, mas não registra quanto foi contado,
  por quem, nem a diferença. É a peça que o dono de loja física mais sente falta.
- **Proposta:** abrir caixa com fundo inicial; registrar **sangria** (retirada) e **suprimento**
  (reforço) com motivo; no fechamento, **conferência cega** — o operador informa quanto contou em cada
  forma sem ver o esperado; o sistema mostra a diferença (sobra/falta) por forma e por operador.
- **Reaproveita:** pagamentos em dinheiro com `recebido` e troco já calculados; relatório por atendente.
- **Decisões em aberto:** caixa obrigatório para vender ou opcional por loja (a decisão 5 da Fase 3
  deixou opcional)? Um caixa por loja ou por aparelho/operador? Quem pode reabrir um caixa fechado?

### 1.2 Taxas da maquininha por forma de pagamento
**Esforço:** P · **Depende de:** relatórios (prontos)

- **Problema:** o faturamento mostrado é bruto; a loja recebe menos no cartão.
- **Proposta:** configurar taxa por forma (ex.: crédito 3,2%, débito 1,5%, Pix 0%) e, opcionalmente,
  prazo de recebimento; relatórios passam a mostrar **faturamento líquido** e o total pago em taxas.
- **Decisões em aberto:** taxa vigente na data da venda (guardar histórico da configuração) ou a atual?
  Parcelamento no crédito entra agora?

### 1.3 Custo do produto e margem
**Esforço:** M · **Depende de:** relatórios (prontos)

- **Problema:** "mais vendido" não é "mais lucrativo".
- **Proposta:** campo de custo no produto/variação, **gravado no snapshot do item vendido** (como o
  preço), e relatório de margem por item e por período. Base para ficha técnica (insumos) no futuro.
- **Decisões em aberto:** custo por variação ou só por produto? Item avulso sem custo conta como
  margem 100% ou fica fora?

### 1.4 Financeiro simples
**Esforço:** G · **Depende de:** 1.1 e 1.2 idealmente

- **Proposta:** contas a pagar (fornecedor, aluguel, salários) com vencimento e baixa; contas a receber
  (inclui fiado, ideia 3.2); fluxo de caixa; resultado do mês (vendas − custos − despesas).
- Já listado no roadmap pós-v1 do plano principal — esta ideia detalha o primeiro recorte.

### 1.5 Repasse da taxa de serviço e comissões
**Esforço:** P · **Depende de:** relatório por atendente (pronto)

- **Proposta:** configurar como a taxa de serviço é repartida (igual entre a equipe do turno ou por
  quem lançou) e comissão percentual por papel/pessoa; relatório de quanto pagar a cada um no período.
- **Decisões em aberto:** comissão sobre o bruto ou o líquido de descontos? Quem "atendeu" a comanda
  quando vários garçons lançaram itens?

---

## 2. Operação de salão e cozinha

### 2.1 Adicionais e complementos
**Esforço:** M · **Depende de:** cardápio, PDV, checkout online · **🚧 em implementação (2026-09-19)** —
PR A (modelo, cadastro, PDV e cozinha) pronto; ver §15 do [`modulo-gestao.md`](modulo-gestao.md).

- **Problema:** hoje só existem variação (um preço por opção) e observação livre. "Borda recheada +R$ 8",
  "adicional de queijo", "ponto da carne", "sem cebola" viram texto solto — sem preço, sem relatório,
  sem controle na produção.
- **Proposta:** grupos de complementos por produto (ex.: "Borda" — escolha 1, obrigatório; "Adicionais"
  — até 3, opcional), cada opção com preço (pode ser zero). Aparece no cardápio público, no checkout,
  no PDV e na comanda; vai para o snapshot do item e para a produção; relatório de adicionais mais
  vendidos.
- **Decisões em aberto:** grupos reutilizáveis entre produtos ("Adicionais do açaí" em vários itens)?
  Complemento com quantidade (2× bacon)? Como fica o preço na divisão por item?

### 2.2 Cozinha unificada com estações
**Esforço:** M · **Depende de:** produção (pronta), pedidos online

- **Problema:** a tela de Produção mostra só as comandas; o pedido online continua na fila de Pedidos.
  A cozinha precisa olhar duas telas.
- **Proposta:** uma tela de produção para tudo (online, telefone na fila, comandas), separada por
  **estação** (cozinha, bar, confeitaria — definida pela categoria do cardápio), com tempo de preparo
  esperado e alerta de atraso; a estação só vê o que é dela.
- **Decisões em aberto:** item de pedido online muda o status do pedido inteiro quando todas as estações
  terminam? Estação por categoria ou por produto?

### 2.3 Mapa de mesas
**Esforço:** M · **Depende de:** comandas (prontas)

- **Proposta:** cadastro de mesas (número, área — salão, varanda) e visão em grade com status (livre,
  ocupada, conta pedida, aguardando limpeza) e tempo de ocupação. Abrir comanda tocando na mesa.
- **Decisões em aberto:** manter mesa livre digitada (como hoje) além das cadastradas? Status "conta
  pedida" acionado por quem — garçom ou cliente (ideia 5.2)?

### 2.4 Impressão automática na cozinha
**Esforço:** M · **Depende de:** produção (pronta)

- **Proposta:** a rodada enviada para a produção sai impressa na impressora térmica da estação, sem
  clique. O navegador não imprime sozinho: exige um aplicativo/serviço local (ou impressora de rede
  compatível) que escute as rodadas novas.
- **Decisões em aberto:** qual caminho técnico (app desktop leve, extensão, impressora com API em
  nuvem)? Custo de suporte para o comerciante configurar.

### 2.5 Happy hour e promoções programadas
**Esforço:** P · **Depende de:** cardápio, PDV, checkout

- **Proposta:** preço promocional por dia da semana e faixa de horário ("chopp pela metade das 17h às
  19h, de terça a sexta"), valendo no PDV e no cardápio online, com selo na vitrine.
- **Reaproveita:** `precoEfetivo()` já é o ponto único de preço vigente (hoje só promoção com data fim).
- **Decisões em aberto:** vale pela hora do pedido ou da conclusão? Combos ("hambúrguer + refri por
  R$ 30") entram junto?

---

## 3. Clientes e fidelização

### 3.1 Fidelidade digital
**Esforço:** M · **Depende de:** clientes (prontos), PDV, checkout

- **Proposta:** cartão de carimbos ("a cada 10 cafés, 1 grátis") ou cashback em pontos, atrelado ao
  WhatsApp do cliente. Funciona no balcão, na comanda e no pedido online; o cliente consulta o saldo
  por link; resgate vira desconto registrado na venda.
- **Decisões em aberto:** carimbo, pontos ou os dois? Pontos expiram? Venda cancelada estorna os pontos
  (sim, por coerência com os relatórios)?

### 3.2 Fiado (conta do cliente)
**Esforço:** M · **Depende de:** clientes, pagamentos

- **Problema:** muito comum em cidade pequena, hoje fica no caderno.
- **Proposta:** forma de pagamento "fiado" que exige cliente identificado; limite por cliente; extrato
  (compras e pagamentos); recebimento parcial depois; lembrete de cobrança pronto para o WhatsApp.
- **Cuidado:** fiado não é dinheiro em caixa — relatórios precisam separar "vendido" de "recebido".
- **Decisões em aberto:** quem pode vender fiado e liberar limite? Juros/multa (provavelmente não)?

### 3.3 Campanhas por segmento
**Esforço:** P · **Depende de:** filtros do CRM (prontos)

- **Proposta:** a partir dos filtros que já existem (sumidos há 30 dias, aniversariantes, tags) e de
  novos (top clientes por gasto, quem comprou item X), gerar mensagem pronta e abrir o WhatsApp de cada
  cliente em sequência (`wa.me`), registrando quem recebeu.
- **Sem API do WhatsApp no início** — envio manual assistido; a API (Fase 2 do pedido online) vem depois.
- **LGPD:** oferecer "não quero receber" por cliente e respeitar na lista.

### 3.4 Avaliação pós-venda
**Esforço:** M · **Depende de:** clientes; conversa com "Avaliações de visitantes" do Guia

- **Proposta:** link após a compra (cupom, página do pedido, WhatsApp) com nota e comentário; painel de
  satisfação no módulo; com autorização do cliente, alimenta as avaliações públicas da vitrine.
- **Decisões em aberto:** avaliação só de quem comprou (selo "compra verificada")? Moderação?

---

## 4. Controle e segurança da equipe

### 4.1 Alertas antifraude para o dono
**Esforço:** P · **Depende de:** histórico do pedido e pagamentos (prontos)

- **Proposta:** painel e push com eventos sensíveis — descontos acima do padrão, estornos, itens tirados
  depois de enviados, cancelamentos, comandas canceladas com itens — agrupados por funcionário e período,
  com comparação ao normal da loja.
- **Reaproveita:** tudo já é registrado (`PedidoHistorico` com autor e motivo, estornos em
  `PedidoPagamento`); falta a leitura consolidada.

### 4.2 Limite de desconto por papel com autorização
**Esforço:** P · **Depende de:** permissões (prontas)

- **Proposta:** atendente pode dar desconto até um limite (ex.: 5%); acima disso, gerente/dono autoriza
  no próprio PDV com a senha dele, e a autorização fica registrada com os dois nomes.
- **Decisões em aberto:** limite por papel ou por pessoa? Vale também para cancelar item enviado e
  estornar (hoje exigem dono/gerente logado)?

### 4.3 Meta do dia e do mês
**Esforço:** P · **Depende de:** relatórios (prontos)

- **Proposta:** meta de faturamento diária e mensal com barra de progresso no Resumo e no PDV;
  opcionalmente meta por atendente.

---

## 5. O diferencial: Guia + Gestão

Ideias que sistemas de PDV comuns não conseguem oferecer, porque não têm um guia da cidade acoplado.

### 5.1 Relatório "quanto o guia me trouxe"
**Esforço:** P · **Depende de:** analytics e relatórios (prontos)

- **Proposta:** vendas originadas no guia — pedidos online, visitas vindas de QR Code, busca, mapa,
  home — somadas em reais por mês, com a evolução e o comparativo com o valor do plano ("o guia trouxe
  R$ 4.200 em pedidos este mês").
- **Regra vigente:** junção Guia × Gestão só em números agregados, nunca por visitante (§Fase 3 do plano).
- **Decisões em aberto:** como atribuir pedido online a uma origem sem rastrear o visitante (origem da
  sessão gravada no próprio pedido no checkout, sem identificar a pessoa)?

### 5.2 QR na mesa ligado à comanda
**Esforço:** G · **Depende de:** comandas, cardápio público · **🚧 em implementação (2026-09-18)** —
PR A (mesas, QR, conta pública e chamados) já em `main`; ver §14 do [`modulo-gestao.md`](modulo-gestao.md).
O cadastro de mesas saiu daqui, então o item 2.3 (mapa) ficou menor.

- **Proposta:** QR Code por mesa; o cliente abre o cardápio da vitrine já na mesa e pode (a) acompanhar
  a conta e a divisão no celular, (b) chamar o garçom / pedir a conta, (c) pedir itens que entram na
  comanda **pendentes de aprovação** do garçom.
- **Decisões em aberto:** exigir aprovação sempre? Como evitar pedido de brincadeira (QR fotografado
  fora do salão)? Pagamento pelo celular entra (depende de gateway)?

### 5.3 Status ao vivo na vitrine
**Esforço:** M · **Depende de:** produção, horários

- **Proposta:** "Cozinha aberta até 22h", "espera de ~25 min" (calculada pela fila real de produção),
  "mesas disponíveis agora" — visíveis na vitrine, no mapa e na busca.
- **Decisões em aberto:** o comerciante pode ocultar a espera em horário de pico? Mostrar só com dados
  suficientes (evitar número errado com poucas vendas)?

---

## 6. Robustez do produto

### 6.1 PDV instalável com modo offline
**Esforço:** G · **Depende de:** PDV (pronto)

- **Problema:** em cidade serrana a internet cai; o PDV hoje precisa de conexão.
- **Proposta:** PDV como aplicativo instalável (PWA); vendas feitas sem internet ficam numa fila local e
  sincronizam quando voltar, com numeração provisória e conciliação no servidor.
- **Cuidado:** conflitos (preço mudou, item indisponível, comanda alterada em outro aparelho) — comandas
  offline são bem mais difíceis que venda rápida; talvez só venda rápida offline no primeiro recorte.

### 6.2 Resumo do fim do dia por push ou WhatsApp
**Esforço:** P · **Depende de:** relatórios, push (prontos)

- **Proposta:** em horário configurável (ex.: 23h), o dono recebe faturamento do dia, comparação com a
  semana anterior, formas de pagamento e alertas (ideia 4.1), sem abrir o sistema.

### 6.3 Importar cardápio por planilha ou foto
**Esforço:** M · **Depende de:** cardápio

- **Proposta:** importar produtos, categorias, variações e preços de uma planilha modelo; num segundo
  momento, a partir de foto do cardápio impresso (IA), com revisão antes de salvar.
- **Ganho:** onboarding de loja nova em minutos — ajuda a vender o plano.

### 6.4 Exportação de dados
**Esforço:** P · **Depende de:** relatórios (prontos)

- **Proposta:** CSV de vendas (uma linha por venda) e de itens vendidos, separador `;` e acentos
  corretos para o Excel em português. Adiada na decisão 4 do PR 3 da Fase 3.

---

## Relação com o que já está planejado

| Plano principal ([`modulo-gestao.md`](modulo-gestao.md)) | Ideias relacionadas |
|---|---|
| Fase 4 — Estoque simples | 2.1 (complementos baixam estoque?), 1.3 (custo), 6.3 (importação) |
| Fase 5 — Reservas e agenda | 2.3 (mapa de mesas pode virar reserva de mesa) |
| Roadmap: Financeiro simples | 1.1, 1.2, 1.4, 3.2 |
| Roadmap: Fiscal (NFC-e) | 1.1 (fechamento de caixa é pré-requisito comum) |
| Roadmap: PDV com hardware | 2.4, 6.1 |
| Guia: Avaliações de visitantes | 3.4 |
| Guia: QR Code do perfil | 5.1, 5.2 |
