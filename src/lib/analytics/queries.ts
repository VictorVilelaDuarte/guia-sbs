import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { Origem, TotaisPeriodo, PontoDiario, AnalyticsResumo } from "./types"

// Agregações server-side do analytics do comerciante. Na escala atual,
// agregar direto sobre os eventos brutos é barato — sem rollup. Todas as
// janelas de tempo usam o fuso de São Paulo (mesmo padrão do resto do app).

const TZ = "America/Sao_Paulo"

// createdAt é `timestamp` SEM fuso (Prisma grava UTC). A conversão correta
// para hora local exige declarar o valor como UTC antes de converter:
//   ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'
// → timestamp naive já em horário de SP, determinístico independente do
// timezone da sessão do banco. Um único `AT TIME ZONE` faz o INVERSO
// (interpreta como SP e devolve timestamptz lido no fuso da sessão) e
// deslocava as horas em +6h.
const LOCAL_TS = Prisma.sql`("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})`

function diasAtras(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

async function totaisJanela(
  comercioId: string,
  gte: Date,
  lt?: Date,
): Promise<{ views: number; whatsapp: number; rotas: number }> {
  const grupos = await prisma.analyticsEvent.groupBy({
    by: ["tipo"],
    where: {
      comercioId,
      createdAt: { gte, ...(lt ? { lt } : {}) },
      tipo: { in: ["view", "click_whatsapp", "click_reserva", "click_rota"] },
    },
    _count: { _all: true },
  })
  const get = (tipo: string) =>
    grupos.find((g) => g.tipo === tipo)?._count._all ?? 0
  return {
    views: get("view"),
    // Consulta de disponibilidade de quarto (hospedagem) também abre o
    // WhatsApp — conta como conversão de WhatsApp.
    whatsapp: get("click_whatsapp") + get("click_reserva"),
    rotas: get("click_rota"),
  }
}

async function totaisPeriodo(comercioId: string, dias: number): Promise<TotaisPeriodo> {
  const [atual, anterior] = await Promise.all([
    totaisJanela(comercioId, diasAtras(dias)),
    totaisJanela(comercioId, diasAtras(dias * 2), diasAtras(dias)),
  ])
  return {
    views: atual.views,
    whatsapp: atual.whatsapp,
    rotas: atual.rotas,
    prevViews: anterior.views,
    prevWhatsapp: anterior.whatsapp,
    prevRotas: anterior.rotas,
  }
}

const DIAS_SEMANA = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
]

export async function getAnalyticsResumo(comercioId: string): Promise<AnalyticsResumo> {
  const inicio30 = diasAtras(30)

  const [d7, d30, serieRaw, origensRaw, topItensRaw, funilRaw, picoRaw] =
    await Promise.all([
      totaisPeriodo(comercioId, 7),
      totaisPeriodo(comercioId, 30),

      // Série diária: views e cliques de conversão por dia local
      prisma.$queryRaw<{ dia: string; views: bigint; cliques: bigint }[]>(Prisma.sql`
        SELECT
          to_char(${LOCAL_TS}, 'YYYY-MM-DD') AS dia,
          COUNT(*) FILTER (WHERE tipo = 'view')         AS views,
          COUNT(*) FILTER (WHERE tipo LIKE 'click_%')   AS cliques
        FROM analytics_events
        WHERE "comercioId" = ${comercioId} AND "createdAt" >= ${inicio30}
        GROUP BY 1
      `),

      prisma.analyticsEvent.groupBy({
        by: ["origem"],
        where: { comercioId, tipo: "view", createdAt: { gte: inicio30 } },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
      }),

      prisma.$queryRaw<{ titulo: string; total: bigint }[]>(Prisma.sql`
        SELECT meta->>'titulo' AS titulo, COUNT(*) AS total
        FROM analytics_events
        WHERE "comercioId" = ${comercioId}
          AND tipo = 'item_view'
          AND meta->>'titulo' IS NOT NULL
          AND "createdAt" >= ${inicio30}
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 5
      `),

      prisma.analyticsEvent.groupBy({
        by: ["tipo"],
        where: {
          comercioId,
          tipo: { in: ["view", "cardapio_view", "click_whatsapp", "click_reserva"] },
          createdAt: { gte: inicio30 },
        },
        _count: { _all: true },
      }),

      // Pico: combinação dia-da-semana × faixa de 3h com mais views
      prisma.$queryRaw<{ dow: number; faixa: number; total: bigint }[]>(Prisma.sql`
        SELECT
          EXTRACT(DOW  FROM ${LOCAL_TS})::int                          AS dow,
          (FLOOR(EXTRACT(HOUR FROM ${LOCAL_TS}) / 3) * 3)::int         AS faixa,
          COUNT(*) AS total
        FROM analytics_events
        WHERE "comercioId" = ${comercioId} AND tipo = 'view' AND "createdAt" >= ${inicio30}
        GROUP BY 1, 2
        ORDER BY 3 DESC
        LIMIT 1
      `),
    ])

  // Preenche os 30 dias com zeros (dias sem evento não vêm do GROUP BY)
  const porDia = new Map(serieRaw.map((r) => [r.dia, r]))
  const serieDiaria: PontoDiario[] = []
  for (let i = 29; i >= 0; i--) {
    const d = diasAtras(i)
    const key = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d) // YYYY-MM-DD
    const r = porDia.get(key)
    serieDiaria.push({
      dia: key,
      views: r ? Number(r.views) : 0,
      cliques: r ? Number(r.cliques) : 0,
    })
  }

  const getFunil = (tipo: string) =>
    funilRaw.find((g) => g.tipo === tipo)?._count._all ?? 0

  const pico = picoRaw[0]
    ? {
        diaSemana: DIAS_SEMANA[picoRaw[0].dow] ?? "—",
        faixa: `${picoRaw[0].faixa}h às ${picoRaw[0].faixa + 3}h`,
      }
    : null

  return {
    d7,
    d30,
    serieDiaria,
    origens: origensRaw.map((o) => ({
      origem: (o.origem ?? "desconhecida") as Origem | "desconhecida",
      total: o._count._all,
    })),
    topItens: topItensRaw.map((t) => ({ titulo: t.titulo, total: Number(t.total) })),
    funil: {
      views: getFunil("view"),
      cardapio: getFunil("cardapio_view"),
      whatsapp: getFunil("click_whatsapp") + getFunil("click_reserva"),
    },
    pico,
  }
}
