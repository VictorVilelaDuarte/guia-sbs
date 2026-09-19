import { NextRequest, NextResponse } from "next/server"
import { atualizarGrupo, excluirGrupo } from "@/lib/gestao/complementos"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"
import { grupoSchema } from "../route"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await guardPdv("cardapio:editar")
  if ("resposta" in g) return g.resposta
  const { id } = await params
  const parsed = grupoSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(() => atualizarGrupo(g.ctx, id, parsed.data))
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const g = await guardPdv("cardapio:editar")
  if ("resposta" in g) return g.resposta
  const { id } = await params
  return responder(() => excluirGrupo(g.ctx, id))
}
