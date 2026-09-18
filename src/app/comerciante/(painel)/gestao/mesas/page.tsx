import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { MesasManager } from "@/components/comerciante/mesas/mesas-manager"
import { getPainelBase } from "@/lib/painel/queries"
import { listarMesas } from "@/lib/gestao/mesas"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"
import { SITE_URL } from "@/lib/seo/site"

// Cadastro das mesas e do que o cliente pode fazer pelo QR.
export default async function MesasPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "pedidos:configurar")) notFound()
  if (!temFeature(base.comercio.plan.features, "gestao_relatorios")) {
    return (
      <RecursoBloqueado
        titulo="Mesas e QR Code"
        descricao="Cada mesa ganha um QR Code: o cliente vê a conta no celular, chama o atendente e pede a conta."
      />
    )
  }

  const [mesas, config] = await Promise.all([
    listarMesas(base.comercio.id),
    prisma.pedidoConfig.findUnique({
      where: { comercioId: base.comercio.id },
      select: { mesaQrAbrirConta: true, mesaQrPedido: true, mesaQrChamarGarcom: true, mesaQrPedirConta: true },
    }),
  ])

  return (
    <MesasManager
      iniciais={mesas}
      base={SITE_URL}
      config={config ?? { mesaQrAbrirConta: true, mesaQrPedido: true, mesaQrChamarGarcom: true, mesaQrPedirConta: true }}
    />
  )
}
