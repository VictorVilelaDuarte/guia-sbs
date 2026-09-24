import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { PerfilForm } from "@/components/comerciante/hospedagem/perfil-form"
import { getHospedagemPerfil, getPainelBase } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"

// Só para hospedagem (categoria, não plano): fora dela a página não existe.
export default async function ComodidadesPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!base.comercio.categorias.includes("HOSPEDAGEM") || !temPermissao(base.permissoes, "vitrine:editar")) notFound()
  const perfil = await getHospedagemPerfil(base.comercio.id)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Exibidas na sua vitrine. Os tipos de quarto ficam em Acomodações.
      </p>
      <Card>
        <CardContent>
          <PerfilForm perfilInicial={perfil} />
        </CardContent>
      </Card>
    </div>
  )
}
