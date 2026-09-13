import { NextRequest, NextResponse } from "next/server"
import { resetarSenhaMembro } from "@/lib/gestao/equipe"
import { guardEquipe, respostaDeErro } from "../../_guard"

// Gera nova senha temporária para um membro (devolvida uma vez) e o obriga a
// trocá-la no próximo acesso. Recusado para quem tem acesso a outro comércio.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardEquipe()
  if ("erro" in g) return g.erro
  const { id } = await params

  try {
    const { senhaTemporaria } = await resetarSenhaMembro({
      membroId: id,
      comercioId: g.ctx.comercioId,
      userIdAtual: g.ctx.userId,
    })
    return NextResponse.json({ senhaTemporaria })
  } catch (e) {
    return respostaDeErro(e)
  }
}
