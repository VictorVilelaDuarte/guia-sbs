import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardTabs } from "@/components/comerciante/dashboard-tabs"
import type { PedidoAdmin, PedidoConfigData, ZonaEntregaData } from "@/components/comerciante/pedidos/types"
import { getAnalyticsResumo } from "@/lib/analytics/queries"
import { LogOut, MapPin, Store } from "lucide-react"

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ATIVO: "default",
  PENDENTE: "secondary",
  INATIVO: "outline",
  REJEITADO: "destructive",
}

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  PENDENTE: "Aguardando aprovação",
  INATIVO: "Inativo",
  REJEITADO: "Rejeitado",
}

export default async function ComercinateDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/admin/login")

  const { tab } = await searchParams

  const [comercio, subcategoriasDisponiveis, bairrosCatalogo] = await Promise.all([
    prisma.comercio.findUnique({
      where: { ownerId: session.user.id },
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

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="font-semibold">Guia SBS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.user.name}</span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/admin/login" })
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {!comercio ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Store className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Nenhum comércio vinculado</p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com o administrador para vincular seu comércio.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{comercio.nome}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gerencie as informações do seu comércio
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={statusVariants[comercio.status]}>
                  {statusLabels[comercio.status] ?? comercio.status}
                </Badge>
                <Badge variant={comercio.plan.slug === "premium" ? "default" : "outline"}>
                  {comercio.plan.nome}
                </Badge>
              </div>
            </div>

            <DashboardTabs
              comercio={comercio}
              subcategoriasDisponiveis={subcategoriasDisponiveis}
              analytics={analytics!}
              pedidos={pedidosAdmin}
              pedidoConfig={pedidoConfig}
              bairrosCatalogo={bairrosCatalogo}
              zonasEntrega={zonasEntrega}
              abaInicial={tab}
            />
          </div>
        )}
      </main>
    </div>
  )
}
