import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QuartosManager } from "@/components/comerciante/hospedagem/quartos-manager"
import { getPainelBase, getQuartosData } from "@/lib/painel/queries"
import { temFeature, LIMITES_FREE } from "@/lib/plan-features"

export default async function GestaoAcomodacoesPage() {
  const base = await getPainelBase()
  if (!base) return null
  // Intrínseco à categoria (não é feature de plano) — fora dela a rota não existe.
  if (!base.comercio.categorias.includes("HOSPEDAGEM")) notFound()

  const quartos = await getQuartosData(base.comercio.id)
  const limite = temFeature(base.comercio.plan.features, "fotos_ilimitadas")
    ? undefined
    : LIMITES_FREE.quartos

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acomodações</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tipos de quarto exibidos na sua vitrine. Comodidades e políticas da casa
          ficam em Minha vitrine.
          {limite ? ` Plano Gratuito: até ${limite} quartos.` : ""}
        </p>
      </CardHeader>
      <CardContent>
        <QuartosManager quartosIniciais={quartos} limite={limite} />
      </CardContent>
    </Card>
  )
}
