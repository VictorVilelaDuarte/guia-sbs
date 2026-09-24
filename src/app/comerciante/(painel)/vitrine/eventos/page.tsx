import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { EventosManager } from "@/components/comerciante/eventos-manager"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { getEventosVitrine, getPainelBase } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"

export default async function EventosPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "vitrine:editar")) notFound()
  if (!temFeature(base.comercio.plan.features, "eventos")) {
    return (
      <RecursoBloqueado
        titulo="Eventos"
        descricao="Divulgue eventos, promoções e datas especiais na sua vitrine e na agenda da cidade."
      />
    )
  }
  const eventos = await getEventosVitrine(base.comercio.id)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Divulgue eventos, promoções e datas especiais — eles aparecem na sua vitrine e na agenda da cidade.
      </p>
      <Card>
        <CardContent>
          <EventosManager eventosIniciais={eventos} />
        </CardContent>
      </Card>
    </div>
  )
}
