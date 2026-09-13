import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { PapelMembro } from "@prisma/client"
import { alterarMembro, listarEquipe, removerMembro } from "@/lib/gestao/equipe"
import { guardEquipe, respostaDeErro } from "../_guard"

const patchSchema = z
  .object({
    papel: z.nativeEnum(PapelMembro).optional(),
    ativo: z.boolean().optional(),
  })
  .refine((d) => d.papel !== undefined || d.ativo !== undefined)

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardEquipe()
  if ("erro" in g) return g.erro
  const { id } = await params

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  try {
    await alterarMembro({
      membroId: id,
      comercioId: g.ctx.comercioId,
      userIdAtual: g.ctx.userId,
      ...parsed.data,
    })
    return NextResponse.json(await listarEquipe(g.ctx.comercioId, g.ctx.userId))
  } catch (e) {
    return respostaDeErro(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardEquipe()
  if ("erro" in g) return g.erro
  const { id } = await params

  try {
    const { contaApagada } = await removerMembro({
      membroId: id,
      comercioId: g.ctx.comercioId,
      userIdAtual: g.ctx.userId,
    })
    const equipe = await listarEquipe(g.ctx.comercioId, g.ctx.userId)
    return NextResponse.json({ equipe, contaApagada })
  } catch (e) {
    return respostaDeErro(e)
  }
}
