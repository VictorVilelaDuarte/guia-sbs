import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { temFeature } from "@/lib/plan-features"

// Relatórios de vendas — Fase 3 / PR 3 do docs/modulo-gestao.md (§13.4).
//
// Regras que valem para todas as consultas:
// - A venda conta na data em que foi ENCERRADA (`fechadaEm`): comanda aberta às
//   23h e fechada à 1h entra no dia do caixa. Cancelar venda concluída não muda
//   a data — ela sai do faturamento do dia em que foi concluída e aparece nos
//   cancelamentos desse mesmo dia.
// - Faturamento = pedidos CONCLUIDO. Formas de pagamento vêm de PedidoPagamento
//   (sem estornos) — a soma das formas bate com o faturamento.
// - Dias no fuso de São Paulo. As colunas são timestamp sem fuso gravado em UTC:
//   o período local vira limites em UTC (usa o índice [comercioId, fechadaEm]) e o
//   agrupamento converte UTC → SP.
// - Somas em numeric (exato) e saída em centavos inteiros.

export const TZ_RELATORIO = "America/Sao_Paulo"
export const MAX_DIAS_PERIODO = 366

export interface Periodo {
  de: string // AAAA-MM-DD (local), inclusivo
  ate: string // AAAA-MM-DD (local), inclusivo
}

// ---- datas -----------------------------------------------------------------------

function paraDataUTC(dia: string) {
  return new Date(`${dia}T12:00:00Z`)
}

export function somarDias(dia: string, n: number): string {
  const d = paraDataUTC(dia)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function diasNoPeriodo(p: Periodo): number {
  return Math.round((paraDataUTC(p.ate).getTime() - paraDataUTC(p.de).getTime()) / 86400000) + 1
}

export function hojeLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ_RELATORIO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}

// Período imediatamente anterior, com o mesmo número de dias.
export function periodoAnterior(p: Periodo): Periodo {
  const n = diasNoPeriodo(p)
  return { de: somarDias(p.de, -n), ate: somarDias(p.de, -1) }
}

export type AtalhoPeriodo = "hoje" | "ontem" | "7d" | "30d" | "mes" | "mes-anterior"

export const ATALHOS: { id: AtalhoPeriodo; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "mes", label: "Este mês" },
  { id: "mes-anterior", label: "Mês passado" },
]

export function periodoDoAtalho(id: AtalhoPeriodo, hoje = hojeLocal()): Periodo {
  const [a, m] = hoje.split("-").map(Number)
  const inicioMes = `${hoje.slice(0, 7)}-01`
  switch (id) {
    case "hoje":
      return { de: hoje, ate: hoje }
    case "ontem":
      return { de: somarDias(hoje, -1), ate: somarDias(hoje, -1) }
    case "7d":
      return { de: somarDias(hoje, -6), ate: hoje }
    case "30d":
      return { de: somarDias(hoje, -29), ate: hoje }
    case "mes":
      return { de: inicioMes, ate: hoje }
    case "mes-anterior": {
      const ano = m === 1 ? a - 1 : a
      const mes = m === 1 ? 12 : m - 1
      const de = `${ano}-${String(mes).padStart(2, "0")}-01`
      return { de, ate: somarDias(inicioMes, -1) }
    }
  }
}

const RE_DIA = /^\d{4}-\d{2}-\d{2}$/

// Lê o período da URL: atalho ou de/até. Datas inválidas, invertidas, futuras ou
// acima do limite caem no padrão (7 dias) com o motivo para a tela.
export function lerPeriodo(params: { periodo?: string; de?: string; ate?: string }): {
  periodo: Periodo
  atalho: AtalhoPeriodo | null
  aviso: string | null
} {
  const hoje = hojeLocal()
  const atalho = ATALHOS.find((a) => a.id === params.periodo)?.id
  if (atalho) return { periodo: periodoDoAtalho(atalho, hoje), atalho, aviso: null }
  if (params.de || params.ate) {
    const de = params.de ?? ""
    const ate = params.ate ?? ""
    const validas = RE_DIA.test(de) && RE_DIA.test(ate) && !isNaN(paraDataUTC(de).getTime()) && !isNaN(paraDataUTC(ate).getTime())
    let aviso: string | null = null
    if (!validas) aviso = "Datas inválidas."
    else if (de > ate) aviso = "A data inicial é depois da final."
    else if (ate > hoje) aviso = "O período não pode terminar no futuro."
    else if (diasNoPeriodo({ de, ate }) > MAX_DIAS_PERIODO) aviso = "O período máximo é de 12 meses."
    if (!aviso) return { periodo: { de, ate }, atalho: null, aviso: null }
    return { periodo: periodoDoAtalho("7d", hoje), atalho: "7d", aviso }
  }
  return { periodo: periodoDoAtalho("7d", hoje), atalho: "7d", aviso: null }
}

// Limites em UTC (timestamp sem fuso) do período local: [início do dia `de`, início do dia seguinte a `ate`).
function limites(p: Periodo) {
  return Prisma.sql`
    "fechadaEm" >= (${p.de}::timestamp AT TIME ZONE ${TZ_RELATORIO}) AT TIME ZONE 'UTC'
    AND "fechadaEm" < (${somarDias(p.ate, 1)}::timestamp AT TIME ZONE ${TZ_RELATORIO}) AT TIME ZONE 'UTC'`
}

const localSql = (coluna: Prisma.Sql) => Prisma.sql`(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE ${TZ_RELATORIO})`
const c = (v: unknown) => Math.round(Number(v ?? 0)) // numeric em centavos → number

// ---- resumo ------------------------------------------------------------------------

export interface ResumoVendas {
  vendas: number
  faturamentoC: number
  ticketC: number
  brutoC: number // Σ preço × quantidade
  descontosC: number // itens + conta
  servicoC: number
  entregaC: number
}

export async function resumoVendas(comercioId: string, p: Periodo): Promise<ResumoVendas> {
  const [r] = await prisma.$queryRaw<Record<string, unknown>[]>`
    WITH v AS (
      SELECT id, total, desconto, "taxaServico", "taxaEntrega" FROM pedidos
      WHERE "comercioId" = ${comercioId} AND status = 'CONCLUIDO' AND ${limites(p)}
    ), i AS (
      SELECT COALESCE(SUM(pi."precoUnit" * pi.quantidade), 0) AS bruto, COALESCE(SUM(pi.desconto), 0) AS desc_itens
      FROM pedido_itens pi JOIN v ON v.id = pi."pedidoId"
    )
    SELECT
      (SELECT COUNT(*) FROM v)::int AS vendas,
      (SELECT COALESCE(SUM(total), 0) * 100 FROM v) AS faturamento,
      (SELECT COALESCE(SUM(desconto), 0) * 100 FROM v) AS desc_conta,
      (SELECT COALESCE(SUM("taxaServico"), 0) * 100 FROM v) AS servico,
      (SELECT COALESCE(SUM("taxaEntrega"), 0) * 100 FROM v) AS entrega,
      i.bruto * 100 AS bruto, i.desc_itens * 100 AS desc_itens
    FROM i`
  const vendas = Number(r.vendas)
  const faturamentoC = c(r.faturamento)
  return {
    vendas,
    faturamentoC,
    ticketC: vendas > 0 ? Math.round(faturamentoC / vendas) : 0,
    brutoC: c(r.bruto),
    descontosC: c(r.desc_itens) + c(r.desc_conta),
    servicoC: c(r.servico),
    entregaC: c(r.entrega),
  }
}

// Variação percentual (null quando não há base de comparação).
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null
  return Math.round(((atual - anterior) / anterior) * 1000) / 10
}

// ---- série no tempo ------------------------------------------------------------------

export interface PontoSerie {
  chave: string // AAAA-MM-DD ou AAAA-MM
  vendas: number
  faturamentoC: number
}

// Por dia até 62 dias; por mês acima disso. Dias/meses sem venda entram zerados.
export async function serieFaturamento(comercioId: string, p: Periodo): Promise<{ agrupamento: "dia" | "mes"; pontos: PontoSerie[] }> {
  const agrupamento = diasNoPeriodo(p) > 62 ? "mes" : "dia"
  const formato = agrupamento === "dia" ? "YYYY-MM-DD" : "YYYY-MM"
  const linhas = await prisma.$queryRaw<{ chave: string; vendas: number; faturamento: unknown }[]>`
    SELECT to_char(${localSql(Prisma.sql`"fechadaEm"`)}, ${formato}) AS chave,
           COUNT(*)::int AS vendas, SUM(total) * 100 AS faturamento
    FROM pedidos
    WHERE "comercioId" = ${comercioId} AND status = 'CONCLUIDO' AND ${limites(p)}
    GROUP BY 1`
  const mapa = new Map(linhas.map((l) => [l.chave, l]))
  const pontos: PontoSerie[] = []
  if (agrupamento === "dia") {
    for (let d = p.de; d <= p.ate; d = somarDias(d, 1)) {
      const l = mapa.get(d)
      pontos.push({ chave: d, vendas: l?.vendas ?? 0, faturamentoC: c(l?.faturamento) })
    }
  } else {
    let [a, m] = p.de.split("-").map(Number)
    const fim = p.ate.slice(0, 7)
    for (;;) {
      const chave = `${a}-${String(m).padStart(2, "0")}`
      if (chave > fim) break
      const l = mapa.get(chave)
      pontos.push({ chave, vendas: l?.vendas ?? 0, faturamentoC: c(l?.faturamento) })
      m++
      if (m > 12) {
        m = 1
        a++
      }
    }
  }
  return { agrupamento, pontos }
}

// ---- por origem, forma de pagamento, itens, horários, atendentes, entregas ----------

export async function vendasPorOrigem(comercioId: string, p: Periodo) {
  const linhas = await prisma.$queryRaw<{ origem: string; vendas: number; faturamento: unknown }[]>`
    SELECT origem::text AS origem, COUNT(*)::int AS vendas, SUM(total) * 100 AS faturamento
    FROM pedidos
    WHERE "comercioId" = ${comercioId} AND status = 'CONCLUIDO' AND ${limites(p)}
    GROUP BY origem ORDER BY SUM(total) DESC`
  return linhas.map((l) => ({
    origem: l.origem as "ONLINE" | "BALCAO" | "TELEFONE" | "COMANDA",
    vendas: l.vendas,
    faturamentoC: c(l.faturamento),
    ticketC: l.vendas > 0 ? Math.round(c(l.faturamento) / l.vendas) : 0,
  }))
}

export async function fechamentoPorForma(comercioId: string, p: Periodo) {
  const linhas = await prisma.$queryRaw<{ forma: string; pagamentos: number; valor: unknown; recebido: unknown; troco: unknown }[]>`
    SELECT g.forma, COUNT(*)::int AS pagamentos, SUM(g.valor) * 100 AS valor,
           COALESCE(SUM(COALESCE(g.recebido, g.valor)), 0) * 100 AS recebido,
           COALESCE(SUM(g.recebido - g.valor) FILTER (WHERE g.recebido IS NOT NULL), 0) * 100 AS troco
    FROM pedido_pagamentos g
    JOIN pedidos v ON v.id = g."pedidoId"
    WHERE v."comercioId" = ${comercioId} AND v.status = 'CONCLUIDO' AND ${limites(p)} AND g."estornadoEm" IS NULL
    GROUP BY g.forma ORDER BY SUM(g.valor) DESC`
  return linhas.map((l) => ({ forma: l.forma, pagamentos: l.pagamentos, valorC: c(l.valor), recebidoC: c(l.recebido), trocoC: c(l.troco) }))
}

export async function itensMaisVendidos(comercioId: string, p: Periodo, limite = 15) {
  const linhas = await prisma.$queryRaw<{ titulo: string; variacao: string | null; avulso: boolean; quantidade: number; valor: unknown }[]>`
    SELECT pi.titulo, pi."variacaoNome" AS variacao, (pi."produtoId" IS NULL) AS avulso,
           SUM(pi.quantidade)::int AS quantidade, SUM(pi."precoUnit" * pi.quantidade - pi.desconto) * 100 AS valor
    FROM pedido_itens pi
    JOIN pedidos v ON v.id = pi."pedidoId"
    WHERE v."comercioId" = ${comercioId} AND v.status = 'CONCLUIDO' AND ${limites(p)}
    GROUP BY 1, 2, 3
    ORDER BY valor DESC, quantidade DESC
    LIMIT ${limite}`
  return linhas.map((l) => ({ titulo: l.titulo, variacao: l.variacao, avulso: l.avulso, quantidade: l.quantidade, valorC: c(l.valor) }))
}

// Complementos mais vendidos no período (item 2.1 do banco de ideias).
export async function complementosMaisVendidos(comercioId: string, p: Periodo, limite = 10) {
  const linhas = await prisma.$queryRaw<{ grupo: string; nome: string; quantidade: number; valor: unknown }[]>`
    SELECT c."grupoNome" AS grupo, c.nome, SUM(c.quantidade * pi.quantidade)::int AS quantidade,
           SUM(c."precoUnit" * c.quantidade * pi.quantidade) * 100 AS valor
    FROM pedido_item_complementos c
    JOIN pedido_itens pi ON pi.id = c."pedidoItemId"
    JOIN pedidos v ON v.id = pi."pedidoId"
    WHERE v."comercioId" = ${comercioId} AND v.status = 'CONCLUIDO' AND ${limites(p)}
    GROUP BY 1, 2
    ORDER BY valor DESC, quantidade DESC
    LIMIT ${limite}`
  return linhas.map((l) => ({ grupo: l.grupo, nome: l.nome, quantidade: l.quantidade, valorC: c(l.valor) }))
}

export async function vendasPorHorario(comercioId: string, p: Periodo) {
  const linhas = await prisma.$queryRaw<{ tipo: string; n: number; vendas: number; faturamento: unknown }[]>`
    WITH v AS (
      SELECT ${localSql(Prisma.sql`"fechadaEm"`)} AS local, total FROM pedidos
      WHERE "comercioId" = ${comercioId} AND status = 'CONCLUIDO' AND ${limites(p)}
    )
    SELECT 'hora' AS tipo, EXTRACT(HOUR FROM local)::int AS n, COUNT(*)::int AS vendas, SUM(total) * 100 AS faturamento FROM v GROUP BY 2
    UNION ALL
    SELECT 'dia' AS tipo, EXTRACT(DOW FROM local)::int AS n, COUNT(*)::int AS vendas, SUM(total) * 100 AS faturamento FROM v GROUP BY 2`
  const horas = Array.from({ length: 24 }, (_, n) => ({ n, vendas: 0, faturamentoC: 0 }))
  const dias = Array.from({ length: 7 }, (_, n) => ({ n, vendas: 0, faturamentoC: 0 })) // 0 = domingo
  for (const l of linhas) {
    const alvo = l.tipo === "hora" ? horas[l.n] : dias[l.n]
    if (alvo) Object.assign(alvo, { vendas: l.vendas, faturamentoC: c(l.faturamento) })
  }
  return { horas, dias }
}

export async function vendasPorAtendente(comercioId: string, p: Periodo) {
  const linhas = await prisma.$queryRaw<{ nome: string | null; online: boolean; vendas: number; faturamento: unknown; descontos: unknown; servico: unknown }[]>`
    WITH v AS (
      SELECT id, "criadoPorNome", origem, total, desconto, "taxaServico" FROM pedidos
      WHERE "comercioId" = ${comercioId} AND status = 'CONCLUIDO' AND ${limites(p)}
    ), di AS (
      SELECT pi."pedidoId", SUM(pi.desconto) AS d FROM pedido_itens pi JOIN v ON v.id = pi."pedidoId" GROUP BY 1
    )
    SELECT v."criadoPorNome" AS nome, (v.origem = 'ONLINE') AS online, COUNT(*)::int AS vendas,
           SUM(v.total) * 100 AS faturamento,
           SUM(v.desconto + COALESCE(di.d, 0)) * 100 AS descontos,
           SUM(v."taxaServico") * 100 AS servico
    FROM v LEFT JOIN di ON di."pedidoId" = v.id
    GROUP BY 1, 2 ORDER BY SUM(v.total) DESC`
  return linhas.map((l) => ({
    nome: l.online ? "Pedido online" : (l.nome ?? "Sem registro"),
    online: l.online,
    vendas: l.vendas,
    faturamentoC: c(l.faturamento),
    descontosC: c(l.descontos),
    servicoC: c(l.servico),
  }))
}

export async function entregasPorBairro(comercioId: string, p: Periodo) {
  const linhas = await prisma.$queryRaw<{ bairro: string | null; entregas: number; taxas: unknown }[]>`
    SELECT bairro, COUNT(*)::int AS entregas, SUM("taxaEntrega") * 100 AS taxas
    FROM pedidos
    WHERE "comercioId" = ${comercioId} AND status = 'CONCLUIDO' AND "tipoEntrega" = 'ENTREGA' AND ${limites(p)}
    GROUP BY bairro ORDER BY SUM("taxaEntrega") DESC`
  return linhas.map((l) => ({ bairro: l.bairro ?? "Sem bairro", entregas: l.entregas, taxasC: c(l.taxas) }))
}

// ---- cancelamentos e recusas ---------------------------------------------------------

export async function cancelamentos(comercioId: string, p: Periodo) {
  // Juntar comandas encerra a de origem como CANCELADO, mas os itens foram para
  // outra comanda — não é perda. Fica de fora.
  const [totais, lista] = await Promise.all([
    prisma.$queryRaw<{ status: string; qtd: number; valor: unknown }[]>`
      SELECT status::text AS status, COUNT(*)::int AS qtd, SUM(total) * 100 AS valor
      FROM pedidos
      WHERE "comercioId" = ${comercioId} AND status IN ('CANCELADO', 'RECUSADO') AND "juntadaEmId" IS NULL AND ${limites(p)}
      GROUP BY status`,
    prisma.$queryRaw<{ id: string; numero: number; origem: string; status: string; total: unknown; motivo: string | null; fechada: Date; canceladoEm: Date | null; concluida: boolean; mesa: string | null }[]>`
      SELECT p.id, p.numero, p.origem::text AS origem, p.status::text AS status, p.total * 100 AS total,
             p."motivoCancelamento" AS motivo, p."fechadaEm" AS fechada, p.mesa,
             (SELECT MAX(h."createdAt") FROM pedido_historicos h WHERE h."pedidoId" = p.id AND h.status = p.status) AS "canceladoEm",
             EXISTS (SELECT 1 FROM pedido_historicos h WHERE h."pedidoId" = p.id AND h.status = 'CONCLUIDO') AS concluida
      FROM pedidos p
      WHERE p."comercioId" = ${comercioId} AND p.status IN ('CANCELADO', 'RECUSADO') AND p."juntadaEmId" IS NULL AND ${limites(p)}
      ORDER BY p."fechadaEm" DESC
      LIMIT 50`,
  ])
  const t = (s: string) => totais.find((x) => x.status === s)
  return {
    cancelados: { qtd: t("CANCELADO")?.qtd ?? 0, valorC: c(t("CANCELADO")?.valor) },
    recusados: { qtd: t("RECUSADO")?.qtd ?? 0, valorC: c(t("RECUSADO")?.valor) },
    lista: lista.map((l) => ({
      id: l.id,
      numero: l.numero,
      origem: l.origem as "ONLINE" | "BALCAO" | "TELEFONE" | "COMANDA",
      status: l.status as "CANCELADO" | "RECUSADO",
      totalC: c(l.total),
      motivo: l.motivo,
      mesa: l.mesa,
      fechadaEm: l.fechada,
      canceladoEm: l.canceladoEm,
      depoisDeConcluida: l.concluida,
    })),
  }
}

// ---- conversão guia → venda ----------------------------------------------------------

// Única junção permitida entre Guia e Gestão: números agregados do período (visitas
// ao cardápio × pedidos online). Nunca por visitante — os eventos são anônimos.
export async function conversaoGuia(comercioId: string, features: unknown, p: Periodo) {
  if (!temFeature(features, "analytics") || !temFeature(features, "pedido_online")) return null
  const criadoNoPeriodo = Prisma.sql`
    "createdAt" >= (${p.de}::timestamp AT TIME ZONE ${TZ_RELATORIO}) AT TIME ZONE 'UTC'
    AND "createdAt" < (${somarDias(p.ate, 1)}::timestamp AT TIME ZONE ${TZ_RELATORIO}) AT TIME ZONE 'UTC'`
  const [[visitas], [pedidos]] = await Promise.all([
    prisma.$queryRaw<{ views: number; visitantes: number }[]>`
      SELECT COUNT(*)::int AS views, COUNT(DISTINCT "visitorId")::int AS visitantes
      FROM analytics_events
      WHERE "comercioId" = ${comercioId} AND tipo = 'cardapio_view' AND ${criadoNoPeriodo}`,
    prisma.$queryRaw<{ feitos: number; concluidos: number }[]>`
      SELECT COUNT(*)::int AS feitos, COUNT(*) FILTER (WHERE status = 'CONCLUIDO')::int AS concluidos
      FROM pedidos
      WHERE "comercioId" = ${comercioId} AND origem = 'ONLINE' AND ${criadoNoPeriodo}`,
  ])
  const base = visitas.visitantes > 0 ? visitas.visitantes : visitas.views
  return {
    visitasCardapio: visitas.views,
    visitantes: visitas.visitantes,
    pedidosOnline: pedidos.feitos,
    concluidos: pedidos.concluidos,
    taxa: base > 0 ? Math.round((pedidos.feitos / base) * 1000) / 10 : null,
  }
}
