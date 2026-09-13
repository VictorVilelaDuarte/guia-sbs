import { NextResponse } from "next/server"
import { getComercioCtx, negarSemPermissao, type ComercioCtx } from "@/lib/comercio-ctx"
import { temFeature } from "@/lib/plan-features"
import { ErroEquipe } from "@/lib/gestao/equipe"

// Guard comum das rotas de equipe: sessão com comércio, permissão
// equipe:gerenciar (só DONO; admin passa) e feature gestao_equipe no plano.
export async function guardEquipe(): Promise<{ ctx: ComercioCtx } | { erro: NextResponse }> {
  const ctx = await getComercioCtx()
  if (!ctx) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  const negado = negarSemPermissao(ctx, "equipe:gerenciar")
  if (negado) return { erro: negado }
  if (!temFeature(ctx.features, "gestao_equipe")) {
    return {
      erro: NextResponse.json({ error: "O plano deste comércio não inclui equipe." }, { status: 403 }),
    }
  }
  return { ctx }
}

// Traduz as regras violadas (ErroEquipe) em resposta; o resto sobe.
export function respostaDeErro(e: unknown): NextResponse {
  if (e instanceof ErroEquipe) return NextResponse.json({ error: e.message }, { status: e.status })
  throw e
}
