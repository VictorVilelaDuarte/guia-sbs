import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProdutosManager } from "@/components/comerciante/produtos-manager"
import { getCatalogoData, getPainelBase } from "@/lib/painel/queries"
import { temFeature, LIMITES_FREE } from "@/lib/plan-features"
import { cn } from "@/lib/utils"
import { notFound } from "next/navigation"
import { temPermissao } from "@/lib/gestao/permissoes"

const TIPOS = {
  PRODUTO: {
    param: null,
    tab: "Produtos",
    titulo: "Catálogo de produtos",
    descricao: "Produtos físicos ou digitais exibidos no perfil público.",
  },
  SERVICO: {
    param: "servico",
    tab: "Serviços",
    titulo: "Catálogo de serviços",
    descricao: "Serviços oferecidos exibidos no perfil público.",
  },
} as const

export default async function GestaoProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const [{ tipo: tipoParam }, base] = await Promise.all([searchParams, getPainelBase()])
  if (!base) return null
  if (!temPermissao(base.permissoes, "catalogo:editar", "itens:disponibilidade")) notFound()
  const podeEditar = temPermissao(base.permissoes, "catalogo:editar")

  const tipo = tipoParam === "servico" ? "SERVICO" : "PRODUTO"
  const cfg = TIPOS[tipo]
  const { produtos, catalogoCategorias, cardapioCategorias } = await getCatalogoData(
    base.comercio.id,
  )
  const limite = temFeature(base.comercio.plan.features, "fotos_ilimitadas")
    ? undefined
    : LIMITES_FREE.produtos

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["PRODUTO", "SERVICO"] as const).map((t) => (
          <Link
            key={t}
            href={TIPOS[t].param ? `/comerciante/gestao/produtos?tipo=${TIPOS[t].param}` : "/comerciante/gestao/produtos"}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              t === tipo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30",
            )}
          >
            {TIPOS[t].tab}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{cfg.titulo}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {podeEditar
              ? cfg.descricao + (limite ? ` Plano Gratuito: até ${limite} itens por aba.` : "")
              : "Marque como oculto o item indisponível; ele some da vitrine até ser mostrado de novo."}
          </p>
        </CardHeader>
        <CardContent>
          {/* key por tipo: trocar a aba é navegação na mesma página — sem a key, o
              manager manteria o estado (lista, busca) do tipo anterior. */}
          <ProdutosManager
            key={tipo}
            produtosIniciais={produtos}
            categoriasCardapio={cardapioCategorias}
            categoriasCatalogoIniciais={catalogoCategorias.filter((c) => c.tipo === tipo)}
            tipo={tipo}
            limite={limite}
            somenteDisponibilidade={!podeEditar}
          />
        </CardContent>
      </Card>
    </div>
  )
}
