import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"

// Lista de pedidos do comércio para o painel (consumida por polling).
// Filtros opcionais: ?desde=ISO (só pedidos atualizados depois) para polling incremental.
export async function GET(req: NextRequest) {
  const ctx = await getComercioCtx()
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
