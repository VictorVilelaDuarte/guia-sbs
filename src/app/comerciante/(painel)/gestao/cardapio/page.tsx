import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardapioManager } from "@/components/comerciante/cardapio-manager"
import { ComplementosManager } from "@/components/comerciante/cardapio/complementos-manager"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { getCardapioData, getPainelBase } from "@/lib/painel/queries"
import { listarGrupos } from "@/lib/gestao/complementos"
import { notFound } from "next/navigation"
import { temFeature } from "@/lib/plan-features"
import { temPermissao } from "@/lib/gestao/permissoes"

export default async function GestaoCardapioPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "cardapio:editar", "itens:disponibilidade")) notFound()
  const podeEditar = temPermissao(base.permissoes, "cardapio:editar")

  if (!temFeature(base.comercio.plan.features, "cardapio")) {
    return (
      <RecursoBloqueado
        titulo="Cardápio digital"
        descricao="Monte seu cardápio com categorias, fotos e variações de preço, atualizado na hora e exibido na sua vitrine."
      />
    )
  }

  const [{ categorias, gruposComplemento }, grupos] = await Promise.all([
    getCardapioData(base.comercio.id),
    listarGrupos(base.comercio.id),
  ])

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cardápio</CardTitle>
        <p className="text-sm text-muted-foreground">
          {podeEditar
            ? "Organize itens por categoria e defina a ordem de exibição no perfil."
            : "Marque como oculto o item que acabou; ele some do cardápio até ser mostrado de novo."}
        </p>
      </CardHeader>
      <CardContent>
        <CardapioManager categoriasIniciais={categorias} gruposComplemento={gruposComplemento} somenteDisponibilidade={!podeEditar} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Complementos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Borda, adicionais, ponto da carne. Crie o grupo uma vez e ligue nos itens que usam — o preço entra na venda e a escolha aparece para a cozinha.
        </p>
      </CardHeader>
      <CardContent>
        <ComplementosManager iniciais={grupos} somenteLeitura={!podeEditar} />
      </CardContent>
    </Card>
    </div>
  )
}
