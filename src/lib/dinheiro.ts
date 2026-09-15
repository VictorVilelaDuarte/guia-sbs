import { Prisma } from "@prisma/client"

// Dinheiro dos pedidos (Fase 3 do docs/modulo-gestao.md). No banco, os valores
// de pedido são DECIMAL(10,2) e o Prisma devolve `Prisma.Decimal` — que vira
// STRING no JSON ("12.50") e não atravessa Server → Client Component. Toda
// resposta de API e prop de client com valor de pedido passa por aqui.
//
// Contas são feitas em CENTAVOS inteiros: somar reais em ponto flutuante acumula
// erro (0.1 + 0.2 = 0.30000000000000004); somar centavos é exato.

type Valor = Prisma.Decimal | number | string | null | undefined

export function paraCentavos(v: Valor): number {
  if (v === null || v === undefined) return 0
  if (v instanceof Prisma.Decimal) return v.mul(100).toDecimalPlaces(0).toNumber()
  return Math.round(Number(v) * 100)
}

export function deCentavos(centavos: number): Prisma.Decimal {
  return new Prisma.Decimal(centavos).div(100)
}

// Decimal → number para JSON/props. Com 2 casas, o number representa o valor
// exibido sem perda.
export function paraNumero(v: Prisma.Decimal | number): number
export function paraNumero(v: Prisma.Decimal | number | null): number | null
export function paraNumero(v: Prisma.Decimal | number | null): number | null {
  if (v === null) return null
  return v instanceof Prisma.Decimal ? v.toNumber() : v
}
