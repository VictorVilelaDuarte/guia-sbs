import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { registrarVenda } from "@/lib/gestao/vendas"
import { descontoSchema, guardPdv, itemSchema, pagamentoSchema, responder } from "@/lib/gestao/pdv-api"

const vendaSchema = z.object({
  origem: z.enum(["BALCAO", "TELEFONE"]),
  itens: z.array(itemSchema).min(1).max(100),
  clienteId: z.string().nullable().optional(),
  clienteNome: z.string().max(120).nullable().optional(),
  clienteWhats: z.string().max(30).nullable().optional(),
  pagamentos: z.array(pagamentoSchema).min(1).max(40),
  desconto: descontoSchema.nullable().optional(),
  cobrarServico: z.boolean().optional(),
  tipoEntrega: z.enum(["RETIRADA", "ENTREGA"]).optional(),
  endereco: z.string().max(200).nullable().optional(),
  numeroEnd: z.string().max(20).nullable().optional(),
  complemento: z.string().max(120).nullable().optional(),
  referencia: z.string().max(200).nullable().optional(),
  zonaId: z.string().nullable().optional(),
  observacoes: z.string().max(500).nullable().optional(),
  enviarParaFila: z.boolean().optional(),
})

// Venda direta do PDV (balcão/telefone). Permissão vendas:registrar (dono,
// gerente, atendente) + flag gestao_relatorios — independe de pedido_online.
export async function POST(req: NextRequest) {
  const g = await guardPdv("vendas:registrar")
  if ("resposta" in g) return g.resposta
  const parsed = vendaSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(() => registrarVenda(g.ctx, parsed.data), 201)
}
