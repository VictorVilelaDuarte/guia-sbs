import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { pedirNaMesa } from "@/lib/gestao/mesas"
import { ErroVenda } from "@/lib/gestao/vendas"

// Rota PÚBLICA: pedido feito pelo cliente no QR da mesa. Preço e disponibilidade
// vêm do banco; nada entra no total até o atendente aprovar no PDV.
const schema = z.object({
  nome: z.string().max(60),
  whatsapp: z.string().max(30).nullable().optional(),
  itens: z
    .array(
      z.object({
        produtoId: z.string(),
        variacaoId: z.string().nullable().optional(),
        quantidade: z.number().int(),
        observacao: z.string().max(140).nullable().optional(),
        complementos: z.array(z.object({ opcaoId: z.string(), quantidade: z.number().int().min(1).max(20).optional() })).max(40).optional(),
      }),
    )
    .min(1)
    .max(20),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  try {
    return NextResponse.json({ conta: await pedirNaMesa(token, parsed.data) }, { status: 201 })
  } catch (e) {
    if (e instanceof ErroVenda) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
