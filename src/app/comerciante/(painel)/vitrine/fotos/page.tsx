import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { FotosUploader } from "@/components/comerciante/fotos-uploader"
import { getFotosVitrine, getPainelBase } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"
import { LIMITES_FREE, temFeature } from "@/lib/plan-features"

export default async function FotosPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "vitrine:editar")) notFound()
  const fotos = await getFotosVitrine(base.comercio.id)
  const limite = temFeature(base.comercio.plan.features, "fotos_ilimitadas") ? undefined : LIMITES_FREE.fotos

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Aparecem na sua vitrine e no mapa. A primeira foto é a capa.
        {limite ? ` Plano Gratuito: até ${limite} fotos.` : ""}
      </p>
      <Card>
        <CardContent>
          <FotosUploader fotosIniciais={fotos} limite={limite} />
        </CardContent>
      </Card>
    </div>
  )
}
