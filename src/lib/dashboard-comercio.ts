import { prisma } from "@/lib/prisma"
import { getAnalyticsResumo } from "@/lib/analytics/queries"
import type {
  PedidoAdmin,
  PedidoConfigData,
  ZonaEntregaData,
} from "@/components/comerciante/pedidos/types"

// Dados completos do painel de gestão de um comércio (<DashboardTabs>).
// Compartilhado entre o dashboard do comerciante (where por ownerId) e o
// painel do admin em /admin/comercios/[id]/gerenciar (where por id).
export async function getDashboardComercioData(
  where: { ownerId: string } | { id: string },
) {
  const [comercio, subcategoriasDisponiveis, bairrosCatalogo] = await Promise.all([
    prisma.comercio.findUnique({
      where,
      include: {
        plan:     true,
        fotos:    { orderBy: { ordem: "asc" } },
        tags:     { orderBy: { createdAt: "asc" }, select: { id: true, nome: true } },
        subcategorias: { select: { id: true, nome: true, categoria: true } },
        produtos: {
          orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
          include: {
            variacoes: { orderBy: { ordem: "asc" } },
            categoriaCardapio: { select: { id: true, nome: true } },
            categoriaCatalogo: { select: { id: true, nome: true } },
          },
        },
        catalogoCategorias: { orderBy: [{ tipo: "asc" }, { ordem: "asc" }] },
        hospedagemPerfil: true,
        tiposQuarto: { orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] },
        pedidoConfig: true,
        zonasEntrega: { orderBy: [{ cidade: "asc" }, { ordem: "asc" }] },
        pedidos: {
          orderBy: { createdAt: "desc" },
          take: 200,
          include: {
            itens: {
              select: {
                id: true,
                titulo: true,
                variacaoNome: true,
                precoUnit: true,
                quantidade: true,
                observacao: true,
              },
            },
          },
        },
        eventos:  { orderBy: { dataInicio: "asc" } },
        cardapioCategorias: {
          orderBy: { ordem: "asc" },
          include: {
            produtos: {
              orderBy: { ordem: "asc" },
              include: {
                variacoes: { orderBy: { ordem: "asc" } },
                categoriaCardapio: { select: { id: true, nome: true } },
                categoriaCatalogo: { select: { id: true, nome: true } },
              },
            },
          },
        },
      },
    }),
    prisma.subcategoria.findMany({
      where: { ativo: true },
      orderBy: [{ categoria: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, categoria: true },
    }),
    prisma.bairro.findMany({
      where: { ativo: true },
      orderBy: [{ cidade: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, cidade: true, uf: true },
    }),
  ])

  const analytics = comercio ? await getAnalyticsResumo(comercio.id) : null

  // Serializa pedidos/config para os componentes client (datas → ISO).
  const pedidosAdmin: PedidoAdmin[] = (comercio?.pedidos ?? []).map((p) => ({
    id: p.id,
    token: p.token,
    numero: p.numero,
    status: p.status,
    tipoEntrega: p.tipoEntrega,
    clienteNome: p.clienteNome,
    clienteWhats: p.clienteWhats,
    cep: p.cep,
    endereco: p.endereco,
    numeroEnd: p.numeroEnd,
    bairro: p.bairro,
    complemento: p.complemento,
    referencia: p.referencia,
    formaPagamento: p.formaPagamento,
    trocoPara: p.trocoPara,
    observacoes: p.observacoes,
    subtotal: p.subtotal,
    taxaEntrega: p.taxaEntrega,
    total: p.total,
    motivoCancelamento: p.motivoCancelamento,
    createdAt: p.createdAt.toISOString(),
    itens: p.itens,
  }))

  const pedidoConfig: PedidoConfigData | null = comercio?.pedidoConfig
    ? {
        aceitaPedidos: comercio.pedidoConfig.aceitaPedidos,
        entregaAtiva: comercio.pedidoConfig.entregaAtiva,
        retiradaAtiva: comercio.pedidoConfig.retiradaAtiva,
        pedidoMinimo: comercio.pedidoConfig.pedidoMinimo,
        tempoPreparoMin: comercio.pedidoConfig.tempoPreparoMin,
        formasPagamento: comercio.pedidoConfig.formasPagamento,
      }
    : null

  const zonasEntrega: ZonaEntregaData[] = (comercio?.zonasEntrega ?? []).map((z) => ({
    id: z.id,
    bairroId: z.bairroId,
    nome: z.nome,
    cidade: z.cidade,
    uf: z.uf,
    taxa: z.taxa,
    ativo: z.ativo,
  }))

  return {
    comercio,
    subcategoriasDisponiveis,
    bairrosCatalogo,
    analytics,
    pedidosAdmin,
    pedidoConfig,
    zonasEntrega,
  }
}
