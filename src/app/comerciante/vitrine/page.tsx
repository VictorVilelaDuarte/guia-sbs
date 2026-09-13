import { notFound } from "next/navigation"
import { VitrineTabs } from "@/components/comerciante/vitrine-tabs"
import { getPainelBase, getVitrineData } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ tab }, base] = await Promise.all([searchParams, getPainelBase()])
  if (!base) return null
  if (!temPermissao(base.permissoes, "vitrine:editar", "analytics:ver")) notFound()

  const { comercio, subcategoriasDisponiveis, produtosCount, analytics } =
    await getVitrineData(base.comercio.id)
  if (!comercio) notFound()

  return (
    <VitrineTabs
      comercio={comercio}
      subcategoriasDisponiveis={subcategoriasDisponiveis}
      analytics={analytics}
      produtosCount={produtosCount}
      permissoes={base.permissoes}
      abaInicial={tab}
    />
  )
}
