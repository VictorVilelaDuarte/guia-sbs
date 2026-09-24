import { notFound } from "next/navigation"
import { AnalyticsPanel } from "@/components/comerciante/analytics-panel"
import { getPainelBase, getVisitasData } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"

// Aberta para todos os planos: o Gratuito vê as visitas e o teaser do resto.
export default async function VisitasPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "analytics:ver")) notFound()
  const { analytics, perfil } = await getVisitasData(base.comercio.id)

  return <AnalyticsPanel data={analytics} premium={temFeature(base.comercio.plan.features, "analytics")} perfil={perfil} />
}
