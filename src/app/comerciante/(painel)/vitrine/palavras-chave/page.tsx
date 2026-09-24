import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { TagsEditor } from "@/components/comerciante/tags-editor"
import { getPainelBase, getTagsVitrine } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"
import { LIMITES_FREE, temFeature } from "@/lib/plan-features"

export default async function PalavrasChavePage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "vitrine:editar")) notFound()
  const tags = await getTagsVitrine(base.comercio.id)
  const limite = temFeature(base.comercio.plan.features, "fotos_ilimitadas") ? undefined : LIMITES_FREE.tags

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ajudam clientes a encontrar seu comércio na busca.
        {limite ? ` Plano Gratuito: até ${limite} palavras-chave.` : ""}
      </p>
      <Card>
        <CardContent>
          <TagsEditor tagsIniciais={tags} limite={limite} />
        </CardContent>
      </Card>
    </div>
  )
}
