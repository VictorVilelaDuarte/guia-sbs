import { cache } from "react"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, permissoesCtx, vinculosValidos } from "@/lib/comercio-ctx"
import { getAnalyticsResumo } from "@/lib/analytics/queries"
import { pedidoAdminInclude, serializarPedidoAdmin } from "@/lib/pedidos-serializar"
import { paraNumero } from "@/lib/dinheiro"
import { contagemClientes } from "@/lib/gestao/clientes-dados"
import type {
  PedidoAdmin,
  PedidoConfigData,
  ZonaEntregaData,
} from "@/components/comerciante/pedidos/types"

// Loaders do painel do comerciante — um por página, cada um buscando só o que
// a página exibe. Todos recebem o comercioId resolvido por getComercioCtx()
// (comerciante pelo vínculo em ComercioMembro, admin pelo cookie admin_comercio_id).

const TZ = "America/Sao_Paulo"

// Contexto + dados mínimos do comércio para o shell. `cache` deduplica a
// chamada entre o layout e a página no mesmo request.
export const getPainelBase = cache(async () => {
  const ctx = await getComercioCtx()
  if (!ctx) return null
  const comercio = await prisma.comercio.findUnique({
    where: { id: ctx.comercioId },
    select: {
      id: true,
      nome: true,
      slug: true,
      status: true,
      categorias: true,
      plan: { select: { slug: true, nome: true, features: true } },
    },
  })
  if (!comercio) return null
  // Lojas para o seletor do cabeçalho (só comerciante; admin gerencia uma por vez).
  const lojas = ctx.isAdmin
    ? []
    : ((await vinculosValidos(ctx.userId)) ?? []).map((m) => ({ id: m.comercio.id, nome: m.comercio.nome }))
  return { ctx, comercio, permissoes: permissoesCtx(ctx), lojas }
})

const produtoInclude = {
  variacoes: { orderBy: { ordem: "asc" } },
  categoriaCardapio: { select: { id: true, nome: true } },
  categoriaCatalogo: { select: { id: true, nome: true } },
} satisfies Prisma.ProdutoInclude

// --- Vitrine -----------------------------------------------------------------

export async function getVitrineData(comercioId: string) {
  const [comercio, subcategoriasDisponiveis, produtosCount, analytics] = await Promise.all([
    prisma.comercio.findUnique({
      where: { id: comercioId },
      include: {
        plan: true,
        fotos: { orderBy: { ordem: "asc" } },
        tags: { orderBy: { createdAt: "asc" }, select: { id: true, nome: true } },
        subcategorias: { select: { id: true, nome: true, categoria: true } },
        eventos: { orderBy: { dataInicio: "asc" } },
        hospedagemPerfil: true,
      },
    }),
    prisma.subcategoria.findMany({
      where: { ativo: true },
      orderBy: [{ categoria: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, categoria: true },
    }),
    prisma.produto.count({ where: { comercioId } }),
    getAnalyticsResumo(comercioId),
  ])
  return { comercio, subcategoriasDisponiveis, produtosCount, analytics }
}

// --- Gestão: cardápio ----------------------------------------------------------

export async function getCardapioData(comercioId: string) {
  return prisma.cardapioCategoria.findMany({
    where: { comercioId },
    orderBy: { ordem: "asc" },
    include: {
      produtos: { orderBy: { ordem: "asc" }, include: produtoInclude },
    },
  })
}

// --- Gestão: produtos e serviços ---------------------------------------------

export async function getCatalogoData(comercioId: string) {
  const [produtos, catalogoCategorias, cardapioCategorias] = await Promise.all([
    prisma.produto.findMany({
      where: { comercioId },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      include: produtoInclude,
    }),
    prisma.catalogoCategoria.findMany({
      where: { comercioId },
      orderBy: [{ tipo: "asc" }, { ordem: "asc" }],
    }),
    // O dialog de produto só usa id/nome das categorias do cardápio (seção
    // "Incluir no cardápio") — os itens delas não são necessários aqui.
    prisma.cardapioCategoria.findMany({
      where: { comercioId },
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true, ordem: true },
    }),
  ])
  return {
    produtos,
    catalogoCategorias,
    cardapioCategorias: cardapioCategorias.map((c) => ({ ...c, produtos: [] })),
  }
}

// --- Gestão: pedidos -----------------------------------------------------------

export async function getPedidosData(comercioId: string) {
  const [pedidos, config, zonas, bairrosCatalogo] = await Promise.all([
    prisma.pedido.findMany({
      where: { comercioId, status: { not: "ABERTA" } }, // comanda aberta vive no PDV
      orderBy: { createdAt: "desc" },
      take: 200,
      include: pedidoAdminInclude,
    }),
    prisma.pedidoConfig.findUnique({ where: { comercioId } }),
    prisma.zonaEntrega.findMany({
      where: { comercioId },
      orderBy: [{ cidade: "asc" }, { ordem: "asc" }],
    }),
    prisma.bairro.findMany({
      where: { ativo: true },
      orderBy: [{ cidade: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, cidade: true, uf: true },
    }),
  ])

  // Serializa para os componentes client (datas → ISO, Decimal → number).
  const pedidosAdmin: PedidoAdmin[] = pedidos.map(serializarPedidoAdmin)

  const pedidoConfig: PedidoConfigData | null = config
    ? {
        aceitaPedidos: config.aceitaPedidos,
        entregaAtiva: config.entregaAtiva,
        retiradaAtiva: config.retiradaAtiva,
        pedidoMinimo: paraNumero(config.pedidoMinimo),
        tempoPreparoMin: config.tempoPreparoMin,
        formasPagamento: config.formasPagamento,
      }
    : null

  const zonasEntrega: ZonaEntregaData[] = zonas.map((z) => ({
    id: z.id,
    bairroId: z.bairroId,
    nome: z.nome,
    cidade: z.cidade,
    uf: z.uf,
    taxa: paraNumero(z.taxa),
    ativo: z.ativo,
  }))

  return { pedidosAdmin, pedidoConfig, zonasEntrega, bairrosCatalogo }
}

// --- Gestão: acomodações -------------------------------------------------------

export async function getQuartosData(comercioId: string) {
  return prisma.tipoQuarto.findMany({
    where: { comercioId },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
  })
}

// --- Gestão: resumo do dia -----------------------------------------------------

export interface ResumoPedidosHoje {
  pedidos: number // exclui recusados e cancelados (todas as origens)
  concluidos: number
  faturamento: number // soma dos CONCLUIDO — online, balcão e telefone
}

// opts.pedidos: fila de pedidos online (aguardando/andamento/aceite).
// opts.vendas: números do dia (pedidos online + venda manual de balcão/telefone).
export async function getResumoData(comercioId: string, opts: { pedidos: boolean; vendas?: boolean }) {
  const [aguardando, andamento, hoje, config, itensCardapio, indisponiveis, catalogo, quartos, membrosAtivos, clientes, comandasAbertas] =
    await Promise.all([
      opts.pedidos
        ? prisma.pedido.count({ where: { comercioId, status: "AGUARDANDO" } })
        : 0,
      opts.pedidos
        ? prisma.pedido.count({
            where: {
              comercioId,
              status: { in: ["ACEITO", "EM_PREPARO", "PRONTO", "SAIU_ENTREGA"] },
            },
          })
        : 0,
      opts.pedidos || opts.vendas ? pedidosHoje(comercioId) : null,
      opts.pedidos
        ? prisma.pedidoConfig.findUnique({
            where: { comercioId },
            select: { aceitaPedidos: true },
          })
        : null,
      prisma.produto.count({ where: { comercioId, categoriaCardapioId: { not: null } } }),
      prisma.produto.count({
        where: { comercioId, categoriaCardapioId: { not: null }, disponivel: false },
      }),
      prisma.produto.groupBy({
        by: ["tipo"],
        where: { comercioId, categoriaCardapioId: null },
        _count: { _all: true },
      }),
      prisma.tipoQuarto.count({ where: { comercioId, ativo: true } }),
      prisma.comercioMembro.count({ where: { comercioId, ativo: true } }),
      contagemClientes(comercioId),
      opts.vendas ? prisma.pedido.count({ where: { comercioId, origem: "COMANDA", status: "ABERTA" } }) : 0,
    ])

  const porTipo = (tipo: "PRODUTO" | "SERVICO") =>
    catalogo.find((g) => g.tipo === tipo)?._count._all ?? 0

  return {
    aguardando,
    andamento,
    hoje,
    aceitaPedidos: config?.aceitaPedidos ?? false,
    itensCardapio,
    indisponiveis,
    produtos: porTipo("PRODUTO"),
    servicos: porTipo("SERVICO"),
    quartos,
    membrosAtivos,
    clientes,
    comandasAbertas,
  }
}

// "Hoje" é o dia corrente em São Paulo. As colunas são timestamp sem fuso
// gravado em UTC — mesma conversão dupla documentada em src/lib/analytics/queries.ts.
// Agrupar em UTC jogaria os pedidos das 21h às 23h59 no dia seguinte.
// Pedidos do dia contam pela criação; faturamento e concluídos pela data de
// encerramento (fechadaEm) — a mesma regra dos relatórios.
async function pedidosHoje(comercioId: string): Promise<ResumoPedidosHoje> {
  const hoje = (coluna: Prisma.Sql) =>
    Prisma.sql`(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date = (now() AT TIME ZONE ${TZ})::date`
  const [row] = await prisma.$queryRaw<ResumoPedidosHoje[]>`
    SELECT
      COUNT(*) FILTER (WHERE status NOT IN ('RECUSADO', 'CANCELADO') AND ${hoje(Prisma.sql`"createdAt"`)})::int AS pedidos,
      COUNT(*) FILTER (WHERE status = 'CONCLUIDO' AND ${hoje(Prisma.sql`"fechadaEm"`)})::int AS concluidos,
      COALESCE(SUM(total) FILTER (WHERE status = 'CONCLUIDO' AND ${hoje(Prisma.sql`"fechadaEm"`)}), 0)::float AS faturamento
    FROM pedidos
    WHERE "comercioId" = ${comercioId}
      AND ("createdAt" >= now() - interval '3 days' OR "fechadaEm" >= now() - interval '3 days')
  `
  return row ?? { pedidos: 0, concluidos: 0, faturamento: 0 }
}
