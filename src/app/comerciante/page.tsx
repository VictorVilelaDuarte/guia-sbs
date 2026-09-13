import { redirect } from "next/navigation"
import { getPainelBase } from "@/lib/painel/queries"
import { temFeature } from "@/lib/plan-features"
import { temPermissao } from "@/lib/gestao/permissoes"

// Entrada do painel: quem opera pedidos online cai no resumo da Gestão (é o que
// precisa ver durante o expediente); quem não tem nada da vitrine (ex.: atendente,
// produção) também; os demais, na vitrine. Sem comércio vinculado, o layout já
// exibe o estado vazio.
export default async function ComerciantePage() {
  const base = await getPainelBase()
  if (!base) return null
  const { permissoes } = base
  const operaPedidos =
    temFeature(base.comercio.plan.features, "pedido_online") &&
    temPermissao(permissoes, "pedidos:operar")
  const temVitrine = temPermissao(permissoes, "vitrine:editar", "analytics:ver")
  redirect(operaPedidos || !temVitrine ? "/comerciante/gestao" : "/comerciante/vitrine")
}
