import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { posicionarMesas, tirarDaPlanta } from "@/lib/gestao/mesas"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

// Planta do salão: posição das mesas na grade (arrastar no editor da Gestão).
const schema = z.object({
  posicoes: z.array(z.object({ id: z.string(), x: z.number().int(), y: z.number().int() })).max(200).optional(),
  tirar: z.string().optional(), // id da mesa que volta para "sem posição"
})

export async function POST(req: NextRequest) {
  const g = await guardPdv("pedidos:configurar")
  if ("resposta" in g) return g.resposta
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  const { posicoes, tirar } = parsed.data
  if (tirar) return responder(() => tirarDaPlanta(g.ctx, tirar))
  return responder(() => posicionarMesas(g.ctx, posicoes ?? []))
}
