import { notFound } from "next/navigation"
import { VitrineTabs } from "@/components/comerciante/vitrine-tabs"
import { getPainelBase, getVitrineData } from "@/lib/painel/queries"

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ tab }, base] = await Promise.all([searchParams, getPainelBase()])
  if (!base) return null

  const { comercio, subcategoriasDisponiveis, produtosCount, analytics } =
    await getVitrineData(base.comercio.id)
  if (!comercio) notFound()

  return (
    <VitrineTabs
      comercio={comercio}
      subcategoriasDisponiveis={subcategoriasDisponiveis}
      analytics={analytics}
      produtosCount={produtosCount}
      abaInicial={tab}
    />
  )
}
