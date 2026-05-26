import { prisma } from "@/lib/prisma"
import { SubcategoriasManager } from "@/components/admin/subcategorias-manager"
import type { Categoria } from "@prisma/client"

const CATEGORIA_LABELS: Record<Categoria, string> = {
  ALIMENTACAO: "Alimentação",
  HOSPEDAGEM: "Hospedagem",
  TURISMO: "Turismo",
  SERVICO: "Serviço",
  COMERCIO: "Comércio",
  ENTRETENIMENTO: "Entretenimento",
}

export default async function SubcategoriasPage() {
  const subcategorias = await prisma.subcategoria.findMany({
    orderBy: [{ categoria: "asc" }, { ordem: "asc" }, { nome: "asc" }],
    include: { _count: { select: { comercios: true } } },
  })

  const agrupadas = subcategorias.reduce<
    Record<string, typeof subcategorias>
  >((acc, s) => {
    const key = s.categoria
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subcategorias</h1>
        <p className="text-muted-foreground text-sm">
          {subcategorias.length} subcategoria{subcategorias.length !== 1 ? "s" : ""} cadastrada{subcategorias.length !== 1 ? "s" : ""}
        </p>
      </div>

      <SubcategoriasManager agrupadas={agrupadas} categoriaLabels={CATEGORIA_LABELS} />
    </div>
  )
}
