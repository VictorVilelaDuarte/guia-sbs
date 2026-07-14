import { prisma } from "@/lib/prisma"
import { BairrosManager } from "@/components/admin/bairros-manager"

export default async function BairrosPage() {
  const bairros = await prisma.bairro.findMany({
    orderBy: [{ cidade: "asc" }, { ordem: "asc" }, { nome: "asc" }],
    include: { _count: { select: { zonas: true } } },
  })

  const agrupados = bairros.reduce<Record<string, typeof bairros>>((acc, b) => {
    if (!acc[b.cidade]) acc[b.cidade] = []
    acc[b.cidade].push(b)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bairros</h1>
        <p className="text-muted-foreground text-sm">
          Catálogo de bairros e áreas de entrega — usado pelos comércios para
          definir taxas. {bairros.length} cadastrado{bairros.length !== 1 ? "s" : ""}.
        </p>
      </div>

      <BairrosManager agrupados={agrupados} />
    </div>
  )
}
