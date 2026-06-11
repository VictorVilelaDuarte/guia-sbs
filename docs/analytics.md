# Analytics para Comerciantes

> **Status:** implementado (V1, 2026-06-11). Itens de fase futura listados ao final.
> Documento vivo — atualizar conforme a feature evoluir.

Feature da flag `analytics` do plano. Mede o desempenho do perfil público de cada comércio e
apresenta no dashboard do comerciante. Dupla função estratégica: **valor tangível do premium**
("decida com dados") e **motor de engajamento** — comerciante que acompanha números volta ao
dashboard e completa o perfil (pré-requisito da busca por IA, ver `docs/busca-inteligente.md`).

## Arquitetura

```
visitante na vitrine
  └─ VitrineTracker (client, invisível)        src/components/public/analytics/vitrine-tracker.tsx
       ├─ pageview com origem (dedupe/sessão)  src/lib/analytics/track.ts
       ├─ contexto de comércio p/ trackCtx
       └─ delegação de cliques [data-track]
            └─ sendBeacon → POST /api/track    src/app/api/track/route.ts
                 └─ AnalyticsEvent (Prisma)    eventos brutos, anônimos

dashboard do comerciante (Server Component)
  └─ getAnalyticsResumo(comercioId)            src/lib/analytics/queries.ts
       └─ <AnalyticsPanel /> (aba Analytics)   src/components/comerciante/analytics-panel.tsx
```

## Coleta

**Privacidade (LGPD):** anônima por design. `visitorId` é um UUID por sessão de navegação
(`sessionStorage`, sem cookie), nenhuma PII é coletada, bots são filtrados por user-agent e o
endpoint sempre responde 204. **Pré-visualização não conta:** os trackers só montam quando
`status === "ATIVO"`.

**Tipos de evento** (`src/lib/analytics/types.ts` — strings, não enum Prisma, para adicionar
tipos sem migration):

| Tipo | Disparo |
|---|---|
| `view` | vitrine aberta (dedupe por sessão via `trackViewOnce`) |
| `cardapio_view` / `catalogo_view` | páginas dedicadas (dedupe por sessão) |
| `click_whatsapp` `click_ligar` `click_instagram` `click_site` `click_rota` `click_share` | delegação de clique em `[data-track]` (CTAs rápidos, seção contato, share na topbar) |
| `item_view` | bottom sheet de produto aberto (meta: `itemId`, `titulo`) |
| `evento_view` | card de evento 50% visível (IntersectionObserver via `TrackImpression`) |
| `galeria_view` | lightbox da galeria aberto |

**Origem da visita:** links internos para a vitrine carregam `?src=` — `home_destaque`,
`home_abertos`, `home_eventos` (home), `listagem` (/comercios), `mapa` (sheet do mapa);
`busca` e `qr` já previstos. Sem `?src=`, o referrer decide entre `google` e `direto`.
**Ao criar um link interno novo para a vitrine, incluir `?src=`.**

**Padrões para instrumentar coisas novas:**
- Link/botão server-side → atributo `data-track="<tipo>"` (o listener do `VitrineTracker` captura)
- Client component compartilhado → `trackCtx(tipo, opts)` (no-op fora de páginas de comércio —
  ex.: galeria reusada nos pontos turísticos)
- Impressão ao rolar → `<TrackImpression comercioId tipo meta>`

## Dashboard (aba Analytics)

Aba **sem** `feature` no config (abre para todos): o FREE vê o card de visitas real + teasers
borrados com cadeado (estratégia de conversão — mostrar que o dado existe); a flag `analytics`
libera tudo. Conteúdo: cards 7/30 dias com variação vs. período anterior (visitas, WhatsApp,
rotas), gráfico SVG diário (sem lib de chart), donut de origem, top 5 itens, funil
perfil→cardápio→WhatsApp, "horário de ouro" (dia × faixa de 3h com mais views) e o box
"Melhore seus números" (checklist de completude do perfil — visível para todos).

## Agregação

`getAnalyticsResumo` roda 7 queries em paralelo (groupBy + `$queryRaw` para série diária,
top itens via `meta->>'titulo'` e pico por dia/hora). Janelas no fuso `America/Sao_Paulo`.
Eventos brutos sem rollup — na escala atual é barato; se um dia o volume crescer, criar rollup
diário sem mudar a interface do resumo.

## Fase futura (bônus — decididamente fora da V1)

- Relatório mensal por e-mail/WhatsApp ("seu mês no AIRotas")
- Benchmark anônimo por categoria
- Visão admin agregada da plataforma (números para vender o produto)
- Termos de busca que levaram ao perfil (depende da busca por IA)
- Origem `qr` ligada de fato (depende da feature QR Code — usar `?src=qr` no link do QR)
- Multitenant: `AnalyticsEvent` herda a cidade via `comercioId` — nada a fazer na migração
  além do scoping das queries admin (ver `docs/multitenant.md`)
