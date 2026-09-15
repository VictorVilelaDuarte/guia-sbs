import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { abrirComanda, listarComandasAbertas } from "@/lib/gestao/comandas"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

// Comandas abertas (polling do PDV) e abertura de comanda por mesa ou nome.
export async function GET() {
  const g = await guardPdv("vendas:registrar")
  if ("resposta" in g) return g.resposta
  return responder(() => listarComandasAbertas(g.ctx.comercioId))
}

const abrirSchema = z.object({
  mesa: z.string().max(20).nullable().optional(),
  nome: z.string().max(60).nullable().optional(),
  clienteId: z.string().nullable().optional(),
  clienteWhats: z.string().max(30).nullable().optional(),
  cobrarServico: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const g = await guardPdv("vendas:registrar")
  if ("resposta" in g) return g.resposta
  const parsed = abrirSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(() => abrirComanda(g.ctx, parsed.data), 201)
}
