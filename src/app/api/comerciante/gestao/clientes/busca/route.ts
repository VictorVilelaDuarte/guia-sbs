import { NextRequest, NextResponse } from "next/server"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import { temFeature } from "@/lib/plan-features"
import { listarClientes } from "@/lib/gestao/clientes-dados"
import { formatWhatsapp } from "@/components/comerciante/clientes/formato"

// Busca rápida de clientes para a venda manual (autocomplete). Exige ver clientes
// E a flag gestao_clientes — sem ela, a venda aceita só nome/WhatsApp digitados
// (a lista de clientes da loja não é exposta a plano que não a inclui).
export async function GET(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const negado = negarSemPermissao(ctx, "clientes:ver")
  if (negado) return negado
  if (!temFeature(ctx.features, "gestao_clientes")) return NextResponse.json([])

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json([])

  const { itens } = await listarClientes(ctx.comercioId, { busca: q, ordem: "recente", pagina: 1 })
  return NextResponse.json(
    itens.slice(0, 8).map((c) => ({ id: c.id, nome: c.nome, whatsapp: formatWhatsapp(c.whatsapp) })),
  )
}
