import { redirect } from "next/navigation"
import { getPainelBase } from "@/lib/painel/queries"
import { temFeature } from "@/lib/plan-features"

// Entrada do painel: quem recebe pedidos online cai no resumo da Gestão (é o
// que precisa ver durante o expediente); os demais, na vitrine. Sem comércio
// vinculado, o layout já exibe o estado vazio.
export default async function ComerciantePage() {
  const base = await getPainelBase()
  if (!base) return null
  redirect(
    temFeature(base.comercio.plan.features, "pedido_online")
      ? "/comerciante/gestao"
      : "/comerciante/vitrine",
  )
}
