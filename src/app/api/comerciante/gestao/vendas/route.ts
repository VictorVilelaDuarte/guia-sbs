import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import { temFeature } from "@/lib/plan-features"
import { ErroVenda, registrarVenda } from "@/lib/gestao/vendas"

const itemSchema = z.object({
  produtoId: z.string().nullable().optional(),
  variacaoId: z.string().nullable().optional(),
  titulo: z.string().max(120).nullable().optional(),
  precoUnit: z.number().nullable().optional(),
  quantidade: z.number().int(),
  observacao: z.string().max(280).nullable().optional(),
})

const vendaSchema = z.object({
  origem: z.enum(["BALCAO", "TELEFONE"]),
  itens: z.array(itemSchema).min(1).max(100),
  clienteId: z.string().nullable().optional(),
  clienteNome: z.string().max(120).nullable().optional(),
  clienteWhats: z.string().max(30).nullable().optional(),
  formaPagamento: z.string(),
  valorRecebido: z.number().nonnegative().nullable().optional(),
  tipoEntrega: z.enum(["RETIRADA", "ENTREGA"]).optional(),
  endereco: z.string().max(200).nullable().optional(),
  numeroEnd: z.string().max(20).nullable().optional(),
  complemento: z.string().max(120).nullable().optional(),
  referencia: z.string().max(200).nullable().optional(),
  zonaId: z.string().nullable().optional(),
  observacoes: z.string().max(500).nullable().optional(),
  enviarParaFila: z.boolean().optional(),
})

// Venda manual (balcão/telefone). Permissão vendas:registrar (dono, gerente,
// atendente) + flag gestao_relatorios — independe de pedido_online.
export async function POST(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const negado = negarSemPermissao(ctx, "vendas:registrar")
  if (negado) return negado
  if (!temFeature(ctx.features, "gestao_relatorios")) {
    return NextResponse.json({ error: "O plano deste comércio não inclui venda manual." }, { status: 403 })
  }

  const parsed = vendaSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  try {
    const venda = await registrarVenda(ctx, parsed.data)
    return NextResponse.json(venda, { status: 201 })
  } catch (e) {
    if (e instanceof ErroVenda) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
