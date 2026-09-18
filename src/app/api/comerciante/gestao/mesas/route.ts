import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { criarMesa, listarMesas } from "@/lib/gestao/mesas"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

// Cadastro de mesas (QR na mesa). Quem configura pedidos configura as mesas.
export async function GET() {
  const g = await guardPdv("pedidos:configurar")
  if ("resposta" in g) return g.resposta
  return responder(() => listarMesas(g.ctx.comercioId))
}

const schema = z.object({ nome: z.string().max(20), area: z.string().max(40).nullable().optional() })

export async function POST(req: NextRequest) {
  const g = await guardPdv("pedidos:configurar")
  if ("resposta" in g) return g.resposta
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(() => criarMesa(g.ctx, parsed.data), 201)
}
