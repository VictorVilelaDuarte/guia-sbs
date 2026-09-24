import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditarComercioForm } from "@/components/comerciante/editar-comercio-form"
import { LogoUploader } from "@/components/comerciante/logo-uploader"
import { getPainelBase, getPerfilData } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"

export default async function PerfilPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "vitrine:editar")) notFound()
  const { comercio, subcategoriasDisponiveis } = await getPerfilData(base.comercio.id)
  if (!comercio) notFound()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <LogoUploader logoAtual={comercio.logo} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <EditarComercioForm comercio={comercio} subcategoriasDisponiveis={subcategoriasDisponiveis} />
        </CardContent>
      </Card>
    </div>
  )
}
