# Busca Inteligente por IA — Plano de Design e Implementação

> **Status:** UI de entrada implementada (hero + chips + `/busca` provisória). Motor (Fase 1)
> **pausado intencionalmente** — decisão de 2026-06-10: priorizar features que populam o sistema
> (analytics, QR code, eventos) antes de construir o motor, pois a qualidade da busca semântica
> depende de perfis ricos (produtos, tags, descrições) e o efeito só é mensurável com conteúdo real.
> **Última atualização:** 2026-06-10
> Documento vivo — atualizar ao fim de cada fase com o que foi efetivamente construído.

Este documento captura o design completo da busca inteligente do Guia SBS. A feature é
considerada **o maior diferencial comercial do produto**: permite ao visitante buscar em
linguagem natural ("onde comer um lanche?") e receber resultados relevantes e bem ranqueados
do guia, dando vantagem aos comércios com perfil completo e plano premium.

A landing `/para-comerciantes` já **vende** essa feature (ver `_components/ai-demo.tsx` e
`_components/rotating-query.tsx`) — a implementação real precisa entregar a promessa que a
demo já mostra.

---

## Objetivo

O usuário digita uma pergunta/frase em linguagem natural e o sistema retorna comércios do guia
ranqueados por relevância. Exemplo: `"onde comer lanche?"` deve trazer lanchonetes,
hamburguerias, padarias — mesmo que nenhuma delas tenha a palavra "lanche" literalmente
cadastrada.

**Sinais de ranqueamento desejados** (todos já existem como dados no schema):

| Sinal | Origem no schema |
|---|---|
| Nome do estabelecimento | `Comercio.nome` |
| Descrição | `Comercio.descricao` |
| Categorias / subcategorias | `Comercio.categorias[]`, `Comercio.subcategorias[]` |
| Produtos/serviços cadastrados | `Produto.titulo`, `Produto.descricao` |
| Palavras-chave | `Tag.nome` (relação `Comercio.tags`) |
| Preferência a premium | derivado do `Plan` (ver nota abaixo) |
| Aberto agora | `Comercio.horarios` (lógica em `src/lib/horarios.ts`) |
| Completude do perfil | tem fotos, produtos, descrição preenchida |

> **Nota sobre "premium":** não existe um booleano `premium` no schema. Premium é **derivado do
> `Plan`** (model `Plan` com `features: Json`). O boost de ranking deve checar uma feature do
> plano (ex.: `destaque_busca`) ou o plano pago. Ao implementar, centralizar essa checagem
> numa função (ex.: `isComercioPremium(plan)`) para não espalhar a regra.

---

## A decisão-raiz: o que "IA" significa aqui

A **escala muda tudo**. São Bento do Sapucaí é uma cidade pequena: dezenas a poucas centenas de
comércios, não milhares. Abordagens que seriam caras/complexas num marketplace grande são aqui
triviais e baratas.

Espectro de abordagens:

| Abordagem | O que entende | Custo / latência | É "IA de verdade"? |
|---|---|---|---|
| **A. Full-text (Postgres `tsvector`)** | match de palavras: "lanche" acha "lanche" | grátis, ~10ms | não — busca clássica |
| **B. Embeddings (`pgvector`)** | semântica: "onde comer lanche" acha "hamburgueria", "padaria" | centavos/mês, ~200ms | **sim — é o coração** |
| **C. LLM no topo** | interpreta intenção + escreve resposta ("Para um lanche, recomendo…") | ~1-2s, ~$0.01/busca | sim — o "wow" |

**Por que não basta full-text (A):** a promessa vendida é linguagem natural. Se nenhum comércio
escreveu literalmente "lanche", `"onde comer lanche?"` retornaria vazio com full-text puro.
A promessa **exige no mínimo embeddings (B)**. Com poucas centenas de comércios, B é
praticamente de graça e instantâneo.

### Arquitetura recomendada: híbrido B + A, com boosts de negócio, e C opcional por cima

- **B (embeddings)** dá o recall semântico (entende intenção).
- **A (full-text com `setweight`)** garante o match exato e permite **pesos por campo**
  (nome vale mais que descrição).
- Os dois rankings são fundidos via **Reciprocal Rank Fusion (RRF)**.
- **Boosts de negócio** (premium, aberto agora, perfil completo) reordenam.
- **C (LLM)** entra como camada opcional: re-rankeia só os ~15 finalistas e gera a frase de
  resposta natural. Mantém o custo do LLM baixo (não processa o catálogo inteiro).

---

## Eixo 1 — Comunicação da feature

### Para o visitante (prioridade)
O segredo é **não gritar "IA"**, e sim ensinar pelo exemplo:

- **Placeholder rotativo** (`rotating-query.tsx` já existe) como professor: cicla
  "onde comer um lanche?", "pousada com café da manhã incluso", "o que fazer à noite?".
  Em segundos o usuário entende que pode *perguntar*, não só digitar palavra-chave.
- **Selo discreto ✨** ao lado da barra — sinaliza "isto é diferente" sem parecer gimmick.
  O valor percebido vem da *experiência* (digitei naturalmente e achei), não do rótulo.
- **Frase-resposta no topo** dos resultados (se camada C ativa): *"Encontrei 4 ótimos lugares
  para lanchar 🍔"* — é o que faz parecer mágica.
- **Transparência que gera confiança:** micro-chip em cada card mostrando *por que* apareceu
  ("tem: hambúrguer, batata"). Uma busca que se justifica gera mais confiança.

### Para o comércio (cliente)
Aqui está o gancho comercial:

- Mensagem-chave: *"Quando alguém procura por algo que você oferece — mesmo sem saber seu nome —
  você aparece. Quanto mais completo seu perfil, mais a IA te recomenda."*
- Transforma a busca num **motor de engajamento**: incentiva preencher produtos e palavras-chave
  (bom para todo o produto) **e** justifica o upgrade premium.
- **Indicador de "força de descoberta"** no dashboard (quão encontrável você é):
  "Adicione 3 palavras-chave para aparecer em mais buscas". Gamifica e conecta diretamente
  busca → preenchimento → conversão premium.

### O dilema ético do premium (decisão de produto)
Se premium **sempre** ganha, a busca perde credibilidade com o visitante e a feature morre.
Equilíbrio saudável: premium é **desempate entre relevantes**, nunca um override — um premium
irrelevante para a query **não** deve aparecer. Manter o boost modesto.
**→ Decisão em aberto nº 2.**

---

## Eixo 2 — Apresentação na tela

### Ponto de entrada na home — ✅ IMPLEMENTADO (2026-06-10)

> **Decisão (2026-06-10):** proeminência via **"Barra + chips sugeridos"** (nível intermediário
> entre barra discreta e seção demonstrativa dedicada). Aparente o suficiente para o visitante
> perceber que é uma busca diferente, sem roubar espaço do conteúdo comercial nem empurrá-lo
> para baixo com uma seção extra.

> **Status:** UI de entrada construída. Falta apenas o motor de busca (Fases 1+).
> Arquivos: `hero.tsx` (selo + placeholders + disparo), `search-chips.tsx` (chips),
> `home-client.tsx` (`<SearchChips />` após o `<Hero>`), e `(public)/busca/page.tsx`
> (**página provisória** — exibe a query e oferece fallback para `/comercios` e `/mapa`
> enquanto o ranqueamento por IA não existe). Substituir o miolo da `/busca` na Fase 1.

Mudanças concretas em `src/components/public/home/hero.tsx`:

1. **Selo `✨ IA`** dentro do campo de busca, à direita — reusar exatamente o badge dourado da
   demo (`linear-gradient(135deg, #C4873A, #8B4513)`, ícone `Sparkles`). Garante consistência
   visual entre o que a landing **vende** (`ai-demo.tsx`) e o que o visitante **usa**.
2. **Placeholder rotativo com perguntas naturais** (substitui as palavras soltas atuais
   `"Buscar restaurantes, pousada…"`, que ensinavam busca clássica). Lista inicial:
   - "onde comer um lanche?"
   - "pousada com café da manhã?"
   - "o que fazer hoje à noite?"
   - "café da tarde com vista pra serra?"
3. **Chips de perguntas sugeridas** logo abaixo da barra, clicáveis — tornam a feature tangível
   e viram atalho. Conjunto inicial (ícone + pergunta curta):
   - 🍔 onde comer? · 🛏 onde me hospedar? · 🥾 o que fazer hoje?

**Comportamento de disparo:** `Enter` na barra **ou** clique num chip → navega para
`/busca?q=...`. Clicar no chip pré-preenche a query correspondente.

Mockup (mobile):
```
HERO (foto SBS)
  • São Bento · SP
  Descubra São Bento do Sapucaí
  ╭──────── curva ────────╮

       ✨ Busca com IA
  ┌─────────────────────────┐
  │ 🔍 onde comer um lanche?✨│
  └─────────────────────────┘
   [🍔 onde comer?] [🛏 onde me hospedar?]
   [🥾 o que fazer hoje?]

  ──────── resto da home ────────
```

### Página de resultados `/busca`

- **Disparo:** barra do hero / chips → `Enter` navega para `/busca?q=...`.
  **Submit, não live-search** — cada tecla custaria embedding/LLM, e linguagem natural se digita
  inteira de qualquer forma.
- **Página `/busca`:**
  - Query exibida no topo.
  - (Se camada C) frase-resposta natural.
  - **Lista plana ranqueada** de cards (reusar `card-comercio` de `/comercios`), com badges
    "Premium" / "Aberto agora" e o micro-chip de "por que apareceu".
  - Lista plana, **não** agrupada por categoria — agrupar quebra a lógica de ranking.
- **Loading (~1-2s):** pede animação caprichada. Reaproveitar a estética já pronta em
  `ai-demo.tsx`.
- **Estado vazio inteligente:** nunca "nenhum resultado" seco. "Não achei isso, mas veja estas
  opções de Alimentação perto" + sugestões de categoria.

---

## Eixo 3 — Construção técnica

### Indexação (on-write)
- Habilitar a extensão **`pgvector`** no Supabase (suporte nativo).
- Coluna `embedding vector(N)` — preferir **tabela separada** (`comercio_index` ou similar) para
  reindexar sem tocar no model principal.
- Função `buildSearchDoc(comercio)` que concatena: nome + descrição + categorias + subcategorias
  + tags + títulos/descrições de produtos.
- Gerar embedding ao **criar/editar comércio, produto ou tag** (hooks nas rotas de API
  existentes) + **script de reindexação em massa** para o backfill inicial.

### Query (online)
1. Rota `/api/busca` (Route Handler) recebe `q`.
2. Gera embedding da query.
3. `ORDER BY embedding <=> $queryVec LIMIT 20` (distância cosseno no pgvector).
4. Re-rank com boosts.
5. (Opcional, camada C) Claude re-rankeia os 20 e escreve a frase de resposta.

### Scoring (o coração)
```
score = w_sem · similaridade_semântica        (base: já mistura nome+desc+produtos+tags)
      + w_lex · rank_fulltext                   (match exato; setweight nome=A, tag=A, produto=B, desc=C)
      + boost_premium    (modesto, desempate)
      + boost_aberto_agora
      + boost_perfil_completo (tem fotos, produtos, descrição)
```

**Detalhe importante:** o embedding semântico **já incorpora** nome/descrição/produtos/tags
(tudo entrou no `searchDoc`). Para dar **pesos diferentes por campo** (priorizar nome e
palavra-chave), o caminho limpo é o **full-text com `setweight`** rodando em paralelo e fundido
via RRF. É exatamente a ferramenta para "nome vale mais que descrição".

---

## Faseamento

Cada fase entrega valor sozinha; a troca de tecnologia por baixo é transparente para o usuário.

### Fase 1 — Semântico + boosts
- pgvector + full-text PT com `setweight` + boosts premium/aberto.
- Já entrega a promessa da landing.
- **Critério de pronto:** `"onde comer lanche?"` retorna lanchonetes/hamburguerias ranqueadas,
  premium em vantagem de desempate, aberto-agora priorizado.

### Fase 2 — LLM por cima
- Claude re-rankeia os ~15 finalistas e gera a frase de resposta natural.
- O "wow" da experiência.

### Fase 3 — Intenção + contexto
- Extrair filtros da query ("aberto agora", "perto de mim", faixa de preço).
- Usar a geolocalização que o `/mapa` já capta para ordenar por proximidade.

---

## Decisões (fechadas em 2026-06-10, salvo nota)

1. **Profundidade do MVP — ✅ Fase 1 isolada.** Embeddings + full-text + boosts já entregam a
   promessa da landing. A Fase 2 (LLM) entra logo depois como incremento — com Haiku o custo é
   baixo o suficiente para não exigir replanejamento.
2. **Peso do premium — ✅ desempate leve.** Nunca override: um premium irrelevante para a query
   não aparece. Mantém a credibilidade da busca com o visitante.
3. **Modelo de embedding — ✅ Voyage AI `voyage-4`.** A Anthropic não oferece API de embeddings;
   a parceira oficial é a Voyage AI. Geração atual `voyage-4` (multilíngue, bom português,
   contexto 32k, 1024 dims com Matryoshka — aceita 512/256 para encolher o índice pgvector).
   Preços/1M tokens: `voyage-4-lite` $0.02 · **`voyage-4` $0.06 (escolhido)** · `voyage-4-large`
   $0.12. **200M tokens grátis por conta** — na escala de SBS, custo zero por anos. Usar
   `input_type="document"` na indexação e `input_type="query"` na busca (melhora retrieval) e
   **dimensão 512**. Requer `VOYAGE_API_KEY` no `.env` (cadastro em voyageai.com).
4. **LLM da Fase 2 — ✅ Claude Haiku 4.5** (`claude-haiku-4-5`, $1/$5 por MTok). Re-rankear ~15
   finalistas + frase de resposta custa fração de centavo por busca, com latência baixa. Se a
   qualidade do re-rank decepcionar, upgrade para `claude-sonnet-4-6` ($3/$15).
5. **Escala real hoje — ⏳ em aberto.** Confirmar a contagem de comércios ativos antes da Fase 1
   (esperado: dezenas a centenas — a abordagem simples serve por anos; se um dia passar de ~10k,
   troca-se o índice, não a arquitetura).

---

## Referências no código existente

- `src/app/(public)/para-comerciantes/_components/ai-demo.tsx` — animação que **simula** a busca
  por IA (estética a reaproveitar no loading real).
- `src/app/(public)/para-comerciantes/_components/rotating-query.tsx` — placeholder rotativo de
  queries de exemplo (a usar no hero da home).
- `src/lib/horarios.ts` — `estaAbertoAgora` etc. (sinal "aberto agora" do ranking).
- `src/lib/plan-features.ts` — `temFeature` (checagem de premium para o boost).
- `src/components/public/home/hero.tsx` — barra de busca atual (hoje não navega; ponto de
  disparo da `/busca`).
