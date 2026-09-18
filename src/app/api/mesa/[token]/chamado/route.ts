import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { chamarNaMesa, contaDaMesa } from "@/lib/gestao/mesas"
import { ErroVenda } from "@/lib/gestao/vendas"

// Rota PÚBLICA: "chamar o garçom" e "pedir a conta". Repetir em menos de 2
// minutos não gera chamado novo (ver chamarNaMesa).
const schema = z.object({ tipo: z.enum(["GARCOM", "CONTA"]), observacao: z.string().max(140).nullable().optional() })

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  try {
    const r = await chamarNaMesa(token, parsed.data.tipo, parsed.data.observacao)
    return NextResponse.json({ ...r, conta: await contaDaMesa(token) })
  } catch (e) {
    if (e instanceof ErroVenda) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
