import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import { temFeature } from "@/lib/plan-features"
import { cancelarVendaManual, ErroVenda } from "@/lib/gestao/vendas"

const schema = z.object({ motivo: z.string().trim().min(3).max(280) })

// Cancelar venda manual já concluída (lançada por engano). Só dono e gerente
// (vendas:cancelar); motivo obrigatório, registrado no histórico.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const negado = negarSemPermissao(ctx, "vendas:cancelar")
  if (negado) return negado
  if (!temFeature(ctx.features, "gestao_relatorios")) {
    return NextResponse.json({ error: "O plano deste comércio não inclui venda manual." }, { status: 403 })
  }
  const { id } = await params

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Informe o motivo do cancelamento." }, { status: 400 })

  try {
    await cancelarVendaManual(ctx, id, parsed.data.motivo)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ErroVenda) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
