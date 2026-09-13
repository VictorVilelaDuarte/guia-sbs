import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { PapelMembro } from "@prisma/client"
import { adicionarMembro, listarEquipe } from "@/lib/gestao/equipe"
import { guardEquipe, respostaDeErro } from "./_guard"

const createSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  papel: z.nativeEnum(PapelMembro),
})

export async function GET() {
  const g = await guardEquipe()
  if ("erro" in g) return g.erro
  return NextResponse.json(await listarEquipe(g.ctx.comercioId, g.ctx.userId))
}

// Adiciona membro. E-mail novo cria a conta com senha temporária, devolvida UMA
// vez nesta resposta (não é guardada em texto em lugar nenhum).
export async function POST(req: NextRequest) {
  const g = await guardEquipe()
  if ("erro" in g) return g.erro

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  try {
    const { senhaTemporaria } = await adicionarMembro({ comercioId: g.ctx.comercioId, ...parsed.data })
    const equipe = await listarEquipe(g.ctx.comercioId, g.ctx.userId)
    return NextResponse.json({ equipe, senhaTemporaria }, { status: 201 })
  } catch (e) {
    return respostaDeErro(e)
  }
}
