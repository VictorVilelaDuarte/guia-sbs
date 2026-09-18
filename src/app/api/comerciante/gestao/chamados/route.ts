import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { atenderChamado, chamadosPendentes } from "@/lib/gestao/mesas"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

// Chamados das mesas (garçom / conta) — quem opera o salão vê e atende.
export async function GET() {
  const g = await guardPdv("vendas:registrar", "pedidos:operar")
  if ("resposta" in g) return g.resposta
  return responder(() => chamadosPendentes(g.ctx.comercioId))
}

const schema = z.object({ id: z.string() })

export async function POST(req: NextRequest) {
  const g = await guardPdv("vendas:registrar", "pedidos:operar")
  if ("resposta" in g) return g.resposta
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(() => atenderChamado(g.ctx, parsed.data.id))
}
