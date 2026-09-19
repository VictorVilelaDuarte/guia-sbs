import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ordenarMesas } from "@/lib/gestao/mesas"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

// Ordem das mesas no mapa do salão (arrastar no cadastro).
const schema = z.object({ ids: z.array(z.string()).max(200) })

export async function POST(req: NextRequest) {
  const g = await guardPdv("pedidos:configurar")
  if ("resposta" in g) return g.resposta
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(() => ordenarMesas(g.ctx, parsed.data.ids))
}
