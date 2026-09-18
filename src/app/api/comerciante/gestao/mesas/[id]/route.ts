import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { atualizarMesa, excluirMesa } from "@/lib/gestao/mesas"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  nome: z.string().max(20).optional(),
  area: z.string().max(40).nullable().optional(),
  ativa: z.boolean().optional(),
  trocarToken: z.boolean().optional(), // novo QR: o adesivo antigo para de funcionar
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await guardPdv("pedidos:configurar")
  if ("resposta" in g) return g.resposta
  const { id } = await params
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(() => atualizarMesa(g.ctx, id, parsed.data))
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const g = await guardPdv("pedidos:configurar")
  if ("resposta" in g) return g.resposta
  const { id } = await params
  return responder(() => excluirMesa(g.ctx, id))
}
