import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { solicitacoesPendentes } from "@/lib/gestao/comandas"
import { atenderChamado, chamadosPendentes } from "@/lib/gestao/mesas"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

// Avisos do salão: chamados das mesas (garçom / conta) e pedidos feitos pelo QR
// esperando aprovação. Um endpoint só — o PDV faz um polling e trata os dois.
export async function GET() {
  const g = await guardPdv("vendas:registrar", "pedidos:operar")
  if ("resposta" in g) return g.resposta
  return responder(async () => {
    const [chamados, solicitacoes] = await Promise.all([
      chamadosPendentes(g.ctx.comercioId),
      solicitacoesPendentes(g.ctx.comercioId),
    ])
    return { chamados, solicitacoes }
  })
}

const schema = z.object({ id: z.string() })

export async function POST(req: NextRequest) {
  const g = await guardPdv("vendas:registrar", "pedidos:operar")
  if ("resposta" in g) return g.resposta
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(async () => ({
    chamados: await atenderChamado(g.ctx, parsed.data.id),
    solicitacoes: await solicitacoesPendentes(g.ctx.comercioId),
  }))
}
