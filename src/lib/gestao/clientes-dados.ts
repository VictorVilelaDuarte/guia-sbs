import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { normalizarWhatsapp } from "@/lib/gestao/clientes"

// Consultas e escrita da tela de clientes (Fase 2 / PR 2 do docs/modulo-gestao.md).
// Toda função recebe o comercioId do contexto e filtra por ele — cliente é da loja.
// Totais (pedidos, gasto, último pedido) são calculados em SQL sobre os pedidos:
// nada fica guardado no Cliente (decisão de 2026-09-13).

const TZ = "America/Sao_Paulo"
export const CLIENTES_POR_PAGINA = 20

// Aniversário guarda só dia e mês. O ano fixo (bissexto, para aceitar 29/02) é
// detalhe de armazenamento e nunca aparece na tela.
const ANO_ANIVERSARIO = 2000

export function aniversarioParaData(dia: number, mes: number): Date | null {
  const d = new Date(Date.UTC(ANO_ANIVERSARIO, mes - 1, dia))
  return d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia ? d : null
}

export function aniversarioDaData(d: Date | null): { dia: number; mes: number } | null {
  return d ? { dia: d.getUTCDate(), mes: d.getUTCMonth() + 1 } : null
}

export type FiltroClientes = "sumidos" | "aniversariantes"
export type OrdemClientes = "recente" | "gasto" | "nome"

export interface ClienteLista {
  id: string
  nome: string
  whatsapp: string | null
  tags: string[]
  aniversario: { dia: number; mes: number } | null
  pedidos: number // concluídos
  gasto: number // soma dos concluídos
  ultimoPedido: Date | null // último pedido não recusado/cancelado
}

// Totais por cliente da loja. `ultimoConcluido` alimenta o filtro "sumidos".
function statsCte(comercioId: string) {
  return Prisma.sql`
    WITH stats AS (
      SELECT "clienteId",
        COUNT(*) FILTER (WHERE status = 'CONCLUIDO')::int AS pedidos,
        COALESCE(SUM(total) FILTER (WHERE status = 'CONCLUIDO'), 0)::float AS gasto,
        MAX("createdAt") FILTER (WHERE status = 'CONCLUIDO') AS "ultimoConcluido",
        MAX("createdAt") FILTER (WHERE status NOT IN ('RECUSADO', 'CANCELADO')) AS "ultimoPedido"
      FROM pedidos
      WHERE "comercioId" = ${comercioId} AND "clienteId" IS NOT NULL
      GROUP BY "clienteId"
    )`
}

function escaparLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export async function listarClientes(
  comercioId: string,
  opts: { busca?: string; filtro?: FiltroClientes | null; tag?: string | null; ordem?: OrdemClientes; pagina?: number },
) {
  const pagina = Math.max(1, opts.pagina ?? 1)
  const condicoes: Prisma.Sql[] = [Prisma.sql`c."comercioId" = ${comercioId}`]

  const busca = opts.busca?.trim()
  if (busca) {
    const nome = `%${escaparLike(busca)}%`
    // "99999-0000" ou "+55 (12) 99999-0000" encontram o número: compara os dígitos
    // com a mesma normalização do cadastro (sem o 55 do país).
    const digitos = normalizarWhatsapp(busca) ?? ""
    condicoes.push(
      digitos.length >= 4
        ? Prisma.sql`(c.nome ILIKE ${nome} OR c.whatsapp LIKE ${`%${digitos}%`})`
        : Prisma.sql`c.nome ILIKE ${nome}`,
    )
  }
  if (opts.filtro === "sumidos") {
    condicoes.push(Prisma.sql`s."ultimoConcluido" < now() - interval '30 days'`)
  }
  if (opts.filtro === "aniversariantes") {
    condicoes.push(
      Prisma.sql`EXTRACT(MONTH FROM c.aniversario) = EXTRACT(MONTH FROM (now() AT TIME ZONE ${TZ}))`,
    )
  }
  if (opts.tag) condicoes.push(Prisma.sql`${opts.tag} = ANY(c.tags)`)

  const where = Prisma.join(condicoes, " AND ")
  const ordem =
    opts.filtro === "aniversariantes"
      ? Prisma.sql`EXTRACT(DAY FROM c.aniversario) ASC, c.nome ASC`
      : opts.ordem === "gasto"
        ? Prisma.sql`gasto DESC, c.nome ASC`
        : opts.ordem === "nome"
          ? Prisma.sql`c.nome ASC`
          : Prisma.sql`s."ultimoPedido" DESC NULLS LAST, c."createdAt" DESC`

  const [linhas, [{ total }], tags] = await Promise.all([
    prisma.$queryRaw<
      { id: string; nome: string; whatsapp: string | null; tags: string[]; aniversario: Date | null; pedidos: number; gasto: number; ultimoPedido: Date | null }[]
    >`
      ${statsCte(comercioId)}
      -- tags: coluna de lista sem default no banco — cliente criado sem tags tem NULL
      -- (o Prisma converte para [] só nas consultas do model, não no $queryRaw).
      SELECT c.id, c.nome, c.whatsapp, COALESCE(c.tags, '{}') AS tags, c.aniversario,
        COALESCE(s.pedidos, 0)::int AS pedidos, COALESCE(s.gasto, 0)::float AS gasto, s."ultimoPedido"
      FROM clientes c LEFT JOIN stats s ON s."clienteId" = c.id
      WHERE ${where}
      ORDER BY ${ordem}
      LIMIT ${CLIENTES_POR_PAGINA} OFFSET ${(pagina - 1) * CLIENTES_POR_PAGINA}`,
    prisma.$queryRaw<{ total: number }[]>`
      ${statsCte(comercioId)}
      SELECT COUNT(*)::int AS total FROM clientes c LEFT JOIN stats s ON s."clienteId" = c.id
      WHERE ${where}`,
    prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) AS tag FROM clientes WHERE "comercioId" = ${comercioId} ORDER BY 1`,
  ])

  const itens: ClienteLista[] = linhas.map((l) => ({ ...l, aniversario: aniversarioDaData(l.aniversario) }))
  return { itens, total, pagina, paginas: Math.max(1, Math.ceil(total / CLIENTES_POR_PAGINA)), tags: tags.map((t) => t.tag) }
}

export async function detalheCliente(comercioId: string, clienteId: string) {
  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, comercioId } })
  if (!cliente) return null

  const [[stats], topItens, pedidos] = await Promise.all([
    prisma.$queryRaw<{ pedidos: number; gasto: number; ultimoPedido: Date | null }[]>`
      SELECT
        COUNT(*) FILTER (WHERE status = 'CONCLUIDO')::int AS pedidos,
        COALESCE(SUM(total) FILTER (WHERE status = 'CONCLUIDO'), 0)::float AS gasto,
        MAX("createdAt") FILTER (WHERE status NOT IN ('RECUSADO', 'CANCELADO')) AS "ultimoPedido"
      FROM pedidos WHERE "comercioId" = ${comercioId} AND "clienteId" = ${clienteId}`,
    // Pelo título do snapshot: item renomeado ou excluído do cardápio continua contando.
    prisma.$queryRaw<{ titulo: string; quantidade: number }[]>`
      SELECT i.titulo, SUM(i.quantidade)::int AS quantidade
      FROM pedido_itens i JOIN pedidos p ON p.id = i."pedidoId"
      WHERE p."comercioId" = ${comercioId} AND p."clienteId" = ${clienteId} AND p.status = 'CONCLUIDO'
      GROUP BY i.titulo ORDER BY quantidade DESC, i.titulo ASC LIMIT 5`,
    prisma.pedido.findMany({
      where: { comercioId, clienteId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, numero: true, status: true, total: true, tipoEntrega: true, createdAt: true },
    }),
  ])

  return {
    cliente: { ...cliente, aniversario: aniversarioDaData(cliente.aniversario) },
    stats: {
      pedidos: stats?.pedidos ?? 0,
      gasto: stats?.gasto ?? 0,
      ticketMedio: stats && stats.pedidos > 0 ? stats.gasto / stats.pedidos : 0,
      ultimoPedido: stats?.ultimoPedido ?? null,
    },
    topItens,
    pedidos,
  }
}

// Para o atalho do Resumo: total de clientes e novos no mês corrente (fuso SP).
export async function contagemClientes(comercioId: string) {
  const [row] = await prisma.$queryRaw<{ total: number; novosMes: number }[]>`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE date_trunc('month', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})
            = date_trunc('month', now() AT TIME ZONE ${TZ})
      )::int AS "novosMes"
    FROM clientes WHERE "comercioId" = ${comercioId}`
  return row ?? { total: 0, novosMes: 0 }
}

// --- Escrita ------------------------------------------------------------------

export class ErroCliente extends Error {
  constructor(
    message: string,
    public status = 400,
    public clienteExistenteId?: string,
  ) {
    super(message)
  }
}

export interface DadosCliente {
  nome?: string
  whatsapp?: string | null
  email?: string | null
  aniversarioDia?: number | null
  aniversarioMes?: number | null
  observacoes?: string | null
  tags?: string[]
}

function montarDados(d: DadosCliente) {
  const data: Prisma.ClienteUncheckedUpdateInput = {}
  if (d.nome !== undefined) data.nome = d.nome.trim()
  if (d.whatsapp !== undefined) {
    const w = normalizarWhatsapp(d.whatsapp)
    if (w && (w.length < 10 || w.length > 11)) throw new ErroCliente("WhatsApp inválido — informe o DDD e o número.")
    data.whatsapp = w
  }
  if (d.email !== undefined) data.email = d.email?.trim() || null
  if (d.aniversarioDia !== undefined || d.aniversarioMes !== undefined) {
    if (d.aniversarioDia && d.aniversarioMes) {
      const aniv = aniversarioParaData(d.aniversarioDia, d.aniversarioMes)
      if (!aniv) throw new ErroCliente("Data de aniversário inválida.")
      data.aniversario = aniv
    } else if (!d.aniversarioDia && !d.aniversarioMes) {
      data.aniversario = null
    } else {
      throw new ErroCliente("Informe o dia e o mês do aniversário.")
    }
  }
  if (d.observacoes !== undefined) data.observacoes = d.observacoes?.trim() || null
  if (d.tags !== undefined) {
    data.tags = [...new Set(d.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10)
  }
  return data
}

// Violação do @@unique(comercioId, whatsapp) vira 409 com o id do cliente existente.
async function traduzirUnicidade(e: unknown, comercioId: string, whatsapp: string | null | undefined): Promise<never> {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const w = normalizarWhatsapp(whatsapp)
    const existente = w
      ? await prisma.cliente.findUnique({ where: { comercioId_whatsapp: { comercioId, whatsapp: w } }, select: { id: true } })
      : null
    throw new ErroCliente("Já existe cliente com este WhatsApp.", 409, existente?.id)
  }
  throw e
}

export async function criarCliente(comercioId: string, d: DadosCliente & { nome: string }) {
  const data = montarDados(d)
  try {
    return await prisma.cliente.create({
      data: { ...(data as Prisma.ClienteUncheckedCreateInput), nome: d.nome.trim(), comercioId },
      select: { id: true },
    })
  } catch (e) {
    return traduzirUnicidade(e, comercioId, d.whatsapp)
  }
}

export async function atualizarCliente(comercioId: string, clienteId: string, d: DadosCliente) {
  const existe = await prisma.cliente.findFirst({ where: { id: clienteId, comercioId }, select: { id: true } })
  if (!existe) throw new ErroCliente("Cliente não encontrado.", 404)
  const data = montarDados(d)
  try {
    return await prisma.cliente.update({ where: { id: clienteId }, data, select: { id: true } })
  } catch (e) {
    return traduzirUnicidade(e, comercioId, d.whatsapp)
  }
}
