// Unidades de venda do produto (enum UnidadeProduto). Sem runtime: usado no
// PDV, no formulário do painel e nas telas públicas. Por ora só exibição —
// venda por peso (quantidade decimal) está no roadmap.

export const UNIDADES_PRODUTO = [
  { valor: "UN", rotulo: "Unidade", curto: "un" },
  { valor: "KG", rotulo: "Quilo (kg)", curto: "kg" },
  { valor: "G", rotulo: "Grama (g)", curto: "g" },
  { valor: "L", rotulo: "Litro (L)", curto: "L" },
  { valor: "ML", rotulo: "Mililitro (ml)", curto: "ml" },
  { valor: "CX", rotulo: "Caixa", curto: "cx" },
  { valor: "PCT", rotulo: "Pacote", curto: "pct" },
] as const

export type UnidadeProduto = (typeof UNIDADES_PRODUTO)[number]["valor"]

// Sufixo do preço: "" para unidade (o padrão não polui a tela), " / kg" etc.
export function sufixoUnidade(unidade: string | null | undefined): string {
  if (!unidade || unidade === "UN") return ""
  const u = UNIDADES_PRODUTO.find((x) => x.valor === unidade)
  return u ? ` / ${u.curto}` : ""
}
