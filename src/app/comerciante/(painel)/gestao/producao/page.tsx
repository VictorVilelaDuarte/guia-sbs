import { notFound } from "next/navigation"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { ProducaoBoard } from "@/components/comerciante/pdv/producao-board"
import { getPainelBase } from "@/lib/painel/queries"
import { listarProducao } from "@/lib/gestao/comandas"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"

// Fila da produção (cozinha/bar): rodadas enviadas pelas comandas do PDV.
export default async function ProducaoPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "pedidos:operar")) notFound()
  if (!temFeature(base.comercio.plan.features, "gestao_relatorios")) {
    return (
      <RecursoBloqueado
        titulo="Produção"
        descricao="Receba na cozinha e no bar os itens lançados nas comandas do PDV, rodada por rodada."
      />
    )
  }
  return <ProducaoBoard iniciais={await listarProducao(base.comercio.id)} />
}
