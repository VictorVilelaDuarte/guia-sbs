// Totais de uma venda do PDV — fonte única para a tela (exibição) e para o
// servidor (autoridade). Tudo em CENTAVOS inteiros. Módulo sem runtime.
//
//   subtotal = Σ (preço × quantidade − desconto da linha)
//   total    = subtotal − desconto da conta + taxa de serviço + taxa de entrega
//
// A taxa de serviço incide sobre o consumo já com descontos (subtotal − desconto).

export interface LinhaTotal {
  precoC: number
  quantidade: number
  descontoC?: number
}

export type DescontoConta =
  | { tipo: "valor"; valorC: number }
  | { tipo: "percentual"; percentual: number }
  | null

export interface Totais {
  brutoC: number
  descontoItensC: number
  subtotalC: number
  descontoC: number
  servicoC: number
  entregaC: number
  totalC: number
}

export const MAX_PERCENTUAL_SERVICO = 30

// Arredondamento de percentual sobre centavos (meio para cima; valores positivos).
export function percentualDe(baseC: number, percentual: number): number {
  return Math.round((baseC * percentual) / 100)
}

export function valorLinhaC(l: LinhaTotal): number {
  const bruto = l.precoC * l.quantidade
  return bruto - Math.min(Math.max(l.descontoC ?? 0, 0), bruto)
}

export function calcularTotais(args: {
  linhas: LinhaTotal[]
  desconto?: DescontoConta
  servicoPercentual?: number | null
  entregaC?: number
}): Totais {
  const brutoC = args.linhas.reduce((a, l) => a + l.precoC * l.quantidade, 0)
  const subtotalC = args.linhas.reduce((a, l) => a + valorLinhaC(l), 0)
  const descontoItensC = brutoC - subtotalC

  const d = args.desconto ?? null
  const descontoBruto =
    d === null ? 0 : d.tipo === "valor" ? d.valorC : percentualDe(subtotalC, Math.min(Math.max(d.percentual, 0), 100))
  const descontoC = Math.min(Math.max(descontoBruto, 0), subtotalC)

  const pct = args.servicoPercentual
  const servicoC = pct != null && pct > 0 ? percentualDe(subtotalC - descontoC, pct) : 0
  const entregaC = args.entregaC ?? 0

  return {
    brutoC,
    descontoItensC,
    subtotalC,
    descontoC,
    servicoC,
    entregaC,
    totalC: subtotalC - descontoC + servicoC + entregaC,
  }
}
