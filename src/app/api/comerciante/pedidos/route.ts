import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import { pedidoAdminInclude, serializarPedidoAdmin } from "@/lib/pedidos-serializar"

// Lista de pedidos do comércio para o painel (consumida por polling).
// Filtros opcionais: ?desde=ISO (só pedidos atualizados depois) para polling incremental.
export async function GET(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const negado = negarSemPermissao(ctx, "pedidos:operar")
  if (negado) return negado

  const desdeParam = req.nextUrl.searchParams.get("desde")
  const desde = desdeParam ? new Date(desdeParam) : null

  const pedidos = await prisma.pedido.findMany({
    where: {
      comercioId: ctx.comercioId,
      status: { not: "ABERTA" }, // comanda aberta vive no PDV
      ...(desde && !isNaN(desde.getTime()) ? { updatedAt: { gt: desde } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: pedidoAdminInclude,
  })

  // Decimal → number: sem isso o polling devolveria valores como string.
  return NextResponse.json(pedidos.map(serializarPedidoAdmin))
}
