import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DashboardTabs } from "@/components/comerciante/dashboard-tabs"
import { getDashboardComercioData } from "@/lib/dashboard-comercio"

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

// Painel de gestão completo de um comércio pelo admin — reusa o DashboardTabs
// do comerciante. O middleware grava o cookie admin_comercio_id ao abrir esta
// página; as rotas /api/comerciante/* resolvem o comércio-alvo por ele
// (ver src/lib/comercio-ctx.ts).
export default async function GerenciarComercioAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams])

  const {
    comercio,
    subcategoriasDisponiveis,
    bairrosCatalogo,
    analytics,
    pedidosAdmin,
    pedidoConfig,
    zonasEntrega,
  } = await getDashboardComercioData({ id })

  if (!comercio) notFound()

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/admin/comercios/${comercio.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          {comercio.nome}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{comercio.nome}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Painel completo do comércio
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
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
        <p className="text-sm">
          Você está gerenciando este comércio como administrador — tudo que
          salvar aqui vale como se fosse o próprio comerciante. Evite gerenciar
          dois comércios em abas abertas ao mesmo tempo.
        </p>
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
  )
}
