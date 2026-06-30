import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getComerciante() {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null
  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  return comercio ? { comercioId: comercio.id } : null
}

// Lista de pedidos do comércio para o painel (consumida por polling).
// Filtros opcionais: ?desde=ISO (só pedidos atualizados depois) para polling incremental.
export async function GET(req: NextRequest) {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const desdeParam = req.nextUrl.searchParams.get("desde")
  const desde = desdeParam ? new Date(desdeParam) : null

  const pedidos = await prisma.pedido.findMany({
    where: {
      comercioId: ctx.comercioId,
      ...(desde && !isNaN(desde.getTime()) ? { updatedAt: { gt: desde } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      itens: {
        select: {
          id: true,
          titulo: true,
          variacaoNome: true,
          precoUnit: true,
          quantidade: true,
          observacao: true,
        },
      },
    },
  })

  return NextResponse.json(pedidos)
}
