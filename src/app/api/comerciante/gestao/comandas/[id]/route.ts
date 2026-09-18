import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  alterarItem,
  aprovarSolicitacao,
  atualizarComanda,
  cancelarComanda,
  detalheComanda,
  enviarParaProducao,
  estornarPagamento,
  fecharComanda,
  juntarComandas,
  lancarItens,
  recusarSolicitacao,
  registrarPagamentoComanda,
  removerItem,
} from "@/lib/gestao/comandas"
import { descontoSchema, divisaoSchema, guardPdv, itemSchema, pagamentoSchema, responder } from "@/lib/gestao/pdv-api"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const g = await guardPdv("vendas:registrar")
  if ("resposta" in g) return g.resposta
  const { id } = await params
  return responder(() => detalheComanda(g.ctx.comercioId, id))
}

// Ações sobre a comanda num endpoint só, discriminadas por `acao`. As regras de
// permissão finas (desconto, estorno, tirar item enviado) ficam em comandas.ts.
const acaoSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("lancar"), itens: z.array(itemSchema).min(1).max(100), enviar: z.boolean().default(false) }),
  z.object({ acao: z.literal("enviar") }),
  z.object({
    acao: z.literal("alterarItem"),
    itemId: z.string(),
    quantidade: z.number().int().optional(),
    observacao: z.string().max(280).nullable().optional(),
    desconto: z.number().nonnegative().nullable().optional(),
    motivo: z.string().max(280).nullable().optional(),
  }),
  z.object({ acao: z.literal("removerItem"), itemId: z.string(), motivo: z.string().max(280).nullable().optional() }),
  z.object({
    acao: z.literal("atualizar"),
    mesa: z.string().max(20).nullable().optional(),
    nome: z.string().max(60).nullable().optional(),
    desconto: descontoSchema.nullable().optional(),
    cobrarServico: z.boolean().optional(),
    divisao: divisaoSchema.nullable().optional(),
  }),
  z.object({ acao: z.literal("pagar"), pagamento: pagamentoSchema, fechar: z.boolean().default(false) }),
  z.object({ acao: z.literal("estornar"), pagamentoId: z.string(), motivo: z.string().max(280).nullable().optional() }),
  z.object({ acao: z.literal("fechar") }),
  z.object({ acao: z.literal("cancelar"), motivo: z.string().max(280).nullable().optional() }),
  z.object({ acao: z.literal("juntar"), origemId: z.string() }),
  // pedidos feitos pelo cliente no QR da mesa
  z.object({ acao: z.literal("aprovarPedido"), itemId: z.string().nullable().optional() }),
  z.object({ acao: z.literal("recusarPedido"), itemId: z.string(), motivo: z.string().max(280).nullable().optional() }),
])

export async function POST(req: NextRequest, { params }: Params) {
  const g = await guardPdv("vendas:registrar")
  if ("resposta" in g) return g.resposta
  const { id } = await params
  const parsed = acaoSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  const { ctx } = g
  const a = parsed.data

  return responder(() => {
    switch (a.acao) {
      case "lancar":
        return lancarItens(ctx, id, a.itens, a.enviar)
      case "enviar":
        return enviarParaProducao(ctx, id)
      case "alterarItem":
        return alterarItem(ctx, id, a.itemId, a)
      case "removerItem":
        return removerItem(ctx, id, a.itemId, a.motivo)
      case "atualizar":
        return atualizarComanda(ctx, id, a)
      case "pagar":
        return registrarPagamentoComanda(ctx, id, a.pagamento, a.fechar)
      case "estornar":
        return estornarPagamento(ctx, id, a.pagamentoId, a.motivo)
      case "fechar":
        return fecharComanda(ctx, id)
      case "cancelar":
        return cancelarComanda(ctx, id, a.motivo)
      case "juntar":
        return juntarComandas(ctx, id, a.origemId)
      case "aprovarPedido":
        return aprovarSolicitacao(ctx, id, a.itemId ?? null)
      case "recusarPedido":
        return recusarSolicitacao(ctx, id, a.itemId, a.motivo)
    }
  })
}
