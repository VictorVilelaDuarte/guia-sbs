import type { DescontoInput } from "@/lib/gestao/vendas"

// Tipos e utilitários do PDV no client. Valores sempre em CENTAVOS inteiros.

export interface OpcaoPdv {
  id: string
  nome: string
  preco: number
  quantidadeMax: number
}

export interface GrupoComplementoPdv {
  id: string
  nome: string
  minimo: number
  maximo: number
  opcoes: OpcaoPdv[]
}

export interface ItemCatalogoPdv {
  id: string
  titulo: string
  grupo: string
  grupoOrdem: number
  disponivel: boolean
  preco: number | null // preço vigente (promoção considerada); null quando há variações
  // Código de barras e código interno — a busca acha por eles e a leitura exata lança direto.
  codigos: string[]
  marca: string | null
  unidade: string
  variacoes: { id: string; nome: string; preco: number; codigos: string[] }[]
  complementos: GrupoComplementoPdv[]
}

export interface ZonaPdv {
  id: string
  nome: string
  taxa: number
}

// Linha da venda rápida ou item ainda não lançado na comanda.
export interface ComplementoPdv {
  opcaoId: string
  grupoNome: string
  nome: string
  precoC: number
  quantidade: number
}

export interface LinhaPdv {
  chave: string
  produtoId: string | null
  variacaoId: string | null
  titulo: string
  detalhe: string | null
  precoC: number // já com os complementos somados
  quantidade: number
  observacao: string | null
  descontoC: number
  complementos: ComplementoPdv[]
}

export type { DescontoInput }

export interface PagamentoLocal {
  id: string
  forma: string
  valorC: number
  recebidoC: number | null
  pagante: string | null
  estornado?: boolean
  autorNome?: string | null
}

export const centavos = (v: number) => Math.round((v + Number.EPSILON) * 100)
export const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

// "12,50", "12.50", "1.234,56" → reais (NaN se inválido).
export function parseReais(s: string): number {
  const t = s.trim()
  if (!t) return NaN
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t
  const n = Number(normal)
  return Number.isFinite(n) ? n : NaN
}

export const reaisInput = (c: number) => (c / 100).toFixed(2).replace(".", ",")

export function descontoParaConta(d: DescontoInput | null) {
  if (!d || !(d.valor > 0)) return null
  return d.tipo === "percentual"
    ? ({ tipo: "percentual", percentual: d.valor } as const)
    : ({ tipo: "valor", valorC: centavos(d.valor) } as const)
}

export async function enviarJson<T>(url: string, body: unknown, method = "POST"): Promise<{ ok: true; data: T } | { ok: false; erro: string; status: number; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, erro: data.error ?? "Não foi possível concluir.", status: res.status, data }
    return { ok: true, data }
  } catch {
    return { ok: false, erro: "Falha de conexão.", status: 0, data: {} }
  }
}
