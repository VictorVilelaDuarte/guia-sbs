import type { Produto } from "./types"
export function formatPreco(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parsePreco(formatted: string): number | null {
  const clean = formatted.replace(/\./g, "").replace(",", ".")
  const num = parseFloat(clean)
  return isNaN(num) ? null : num
}

export function displayPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// Todos os códigos do produto e das variações (já normalizados pelo servidor):
// a busca e o "Escanear" das listas do painel procuram em todos.
export function codigosDe(p: Produto): string[] {
  return [p.codigoBarras, p.codigoInterno, ...p.variacoes.flatMap((v) => [v.codigoBarras, v.codigoInterno])].filter(
    (c): c is string => !!c,
  )
}
