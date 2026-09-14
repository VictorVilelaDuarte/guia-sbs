import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { listarProducao, marcarRodadaPronta } from "@/lib/gestao/comandas"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

// Fila da produção: rodadas das comandas enviadas e ainda não prontas.
// pedidos:operar inclui o papel PRODUCAO (cozinha).
export async function GET() {
  const g = await guardPdv("pedidos:operar")
  if ("resposta" in g) return g.resposta
  return responder(() => listarProducao(g.ctx.comercioId))
}

const prontoSchema = z.object({ pedidoId: z.string(), rodada: z.number().int().positive() })

export async function POST(req: NextRequest) {
  const g = await guardPdv("pedidos:operar")
  if ("resposta" in g) return g.resposta
  const parsed = prontoSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(async () => {
    await marcarRodadaPronta(g.ctx, parsed.data.pedidoId, parsed.data.rodada)
    return { ok: true }
  })
}
