import { NextResponse } from "next/server"
import { z } from "zod"
import { getComercioCtx, negarSemPermissao, type ComercioCtx } from "@/lib/comercio-ctx"
import type { Permissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"
import { ErroVenda } from "@/lib/gestao/vendas"

// Guard e schemas compartilhados pelas rotas do PDV (vendas, comandas, produção).
// Flag gestao_relatorios + a permissão pedida; a regra de negócio fica em
// src/lib/gestao/vendas.ts e comandas.ts, que lançam ErroVenda.

export async function guardPdv(...permissoes: Permissao[]): Promise<{ ctx: ComercioCtx } | { resposta: NextResponse }> {
  const ctx = await getComercioCtx()
  if (!ctx) return { resposta: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  const negado = negarSemPermissao(ctx, ...permissoes)
  if (negado) return { resposta: negado }
  if (!temFeature(ctx.features, "gestao_relatorios")) {
    return { resposta: NextResponse.json({ error: "O plano deste comércio não inclui o PDV." }, { status: 403 }) }
  }
  return { ctx }
}

export async function responder<T>(fn: () => Promise<T>, status = 200) {
  try {
    return NextResponse.json(await fn(), { status })
  } catch (e) {
    if (e instanceof ErroVenda) return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status })
    throw e
  }
}

export const itemSchema = z.object({
  produtoId: z.string().nullable().optional(),
  variacaoId: z.string().nullable().optional(),
  titulo: z.string().max(120).nullable().optional(),
  precoUnit: z.number().nullable().optional(),
  quantidade: z.number().int(),
  observacao: z.string().max(280).nullable().optional(),
  desconto: z.number().nonnegative().nullable().optional(),
})

export const pagamentoSchema = z.object({
  forma: z.string(),
  valor: z.number().positive().max(999999),
  recebido: z.number().nonnegative().max(999999).nullable().optional(),
  pagante: z.string().max(60).nullable().optional(),
})

export const descontoSchema = z.object({
  tipo: z.enum(["valor", "percentual"]),
  valor: z.number().nonnegative().max(999999),
})

// Plano de divisão salvo na comanda (src/lib/gestao/divisao.ts), com limites.
export const divisaoSchema = z.object({
  modo: z.enum(["igual", "itens", "valor"]),
  pessoas: z.array(z.object({ id: z.string().max(40), nome: z.string().max(60) })).max(30),
  itens: z.record(z.string().max(40), z.array(z.array(z.string().max(40)).max(30)).max(999)),
  valores: z.record(z.string().max(40), z.number().int().nonnegative()),
})
