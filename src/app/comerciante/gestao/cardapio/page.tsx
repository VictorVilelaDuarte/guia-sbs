import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardapioManager } from "@/components/comerciante/cardapio-manager"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { getCardapioData, getPainelBase } from "@/lib/painel/queries"
import { temFeature } from "@/lib/plan-features"

export default async function GestaoCardapioPage() {
  const base = await getPainelBase()
  if (!base) return null

  if (!temFeature(base.comercio.plan.features, "cardapio")) {
    return (
      <RecursoBloqueado
        titulo="Cardápio digital"
        descricao="Monte seu cardápio com categorias, fotos e variações de preço, atualizado na hora e exibido na sua vitrine."
      />
    )
  }

  const categorias = await getCardapioData(base.comercio.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cardápio</CardTitle>
        <p className="text-sm text-muted-foreground">
          Organize itens por categoria e defina a ordem de exibição no perfil.
        </p>
      </CardHeader>
      <CardContent>
        <CardapioManager categoriasIniciais={categorias} />
      </CardContent>
    </Card>
  )
}
