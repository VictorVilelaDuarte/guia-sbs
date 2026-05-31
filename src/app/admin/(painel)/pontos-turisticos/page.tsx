import { prisma } from "@/lib/prisma"
import { PontosTuristicosManager } from "@/components/admin/pontos-turisticos-manager"

export default async function PontosTuristicosPage() {
  const pontos = await prisma.pontoTuristico.findMany({
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
  })

  return (
    <div className="p-6 space-y-6">
      <PontosTuristicosManager pontos={pontos} />
    </div>
  )
}
