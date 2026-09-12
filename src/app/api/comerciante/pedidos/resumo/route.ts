import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { temFeature } from "@/lib/plan-features"

// Consulta leve para o alerta de pedidos do shell do painel (polling em todas
// as telas). Não traz a lista — só quantos aguardam ação e quantos chegaram
// desde a última consulta.
//
// `agora` é gerado ANTES das contagens e devolvido ao cliente, que o reenvia
// como `desde` na próxima chamada: as janelas [desde, agora) ficam contíguas,
// sem buraco nem contagem dupla, e sem depender do relógio do navegador.
export async function GET(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const agora = new Date()
  if (!temFeature(ctx.features, "pedido_online")) {
    return NextResponse.json({ aguardando: 0, novos: 0, agora: agora.toISOString() })
  }

  const desdeParam = req.nextUrl.searchParams.get("desde")
  const desde = desdeParam ? new Date(desdeParam) : null
  const desdeValido = desde && !isNaN(desde.getTime()) ? desde : null

  const [aguardando, novos] = await Promise.all([
    prisma.pedido.count({ where: { comercioId: ctx.comercioId, status: "AGUARDANDO" } }),
    desdeValido
      ? prisma.pedido.count({
          where: { comercioId: ctx.comercioId, createdAt: { gte: desdeValido, lt: agora } },
        })
      : 0,
  ])

  return NextResponse.json({ aguardando, novos, agora: agora.toISOString() })
}
