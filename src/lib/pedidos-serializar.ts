import type { PedidoItem, Prisma } from "@prisma/client"
import { paraNumero } from "@/lib/dinheiro"
import { historicoPainelSelect } from "@/lib/pedidos-historico"
import type { PedidoAdmin } from "@/components/comerciante/pedidos/types"

// Serialização única de pedidos para JSON e Client Components. Os valores são
// Decimal no banco (Fase 3) — sem passar por aqui, viram string no JSON ("25.00")
// e a soma na tela concatena texto. Toda saída de pedido para fora do servidor
// usa estas funções.

const itemSelect = {
  id: true,
  titulo: true,
  variacaoNome: true,
  precoUnit: true,
  quantidade: true,
  observacao: true,
} satisfies Prisma.PedidoItemSelect

// Include usado pelo painel (carga inicial e polling) — mesma forma nos dois.
export const pedidoAdminInclude = {
  itens: { select: itemSelect },
  historico: historicoPainelSelect,
} satisfies Prisma.PedidoInclude

type PedidoComItens = Prisma.PedidoGetPayload<{ include: typeof pedidoAdminInclude }>

export function serializarItens(itens: Pick<PedidoItem, "id" | "titulo" | "variacaoNome" | "precoUnit" | "quantidade" | "observacao">[]) {
  return itens.map((i) => ({ ...i, precoUnit: paraNumero(i.precoUnit) }))
}

export function serializarPedidoAdmin(p: PedidoComItens): PedidoAdmin {
  return {
    id: p.id,
    token: p.token,
    numero: p.numero,
    status: p.status,
    tipoEntrega: p.tipoEntrega,
    clienteNome: p.clienteNome,
    clienteWhats: p.clienteWhats,
    cep: p.cep,
    endereco: p.endereco,
    numeroEnd: p.numeroEnd,
    bairro: p.bairro,
    complemento: p.complemento,
    referencia: p.referencia,
    formaPagamento: p.formaPagamento,
    trocoPara: paraNumero(p.trocoPara),
    observacoes: p.observacoes,
    subtotal: paraNumero(p.subtotal),
    taxaEntrega: paraNumero(p.taxaEntrega),
    total: paraNumero(p.total),
    motivoCancelamento: p.motivoCancelamento,
    createdAt: p.createdAt.toISOString(),
    origem: p.origem,
    criadoPorNome: p.criadoPorNome,
    itens: serializarItens(p.itens),
    historico: p.historico.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
  }
}

// Valores monetários de um pedido (página e API públicas do cliente).
export function serializarValores<T extends { subtotal: Prisma.Decimal; taxaEntrega: Prisma.Decimal; total: Prisma.Decimal; trocoPara: Prisma.Decimal | null }>(p: T) {
  return {
    ...p,
    subtotal: paraNumero(p.subtotal),
    taxaEntrega: paraNumero(p.taxaEntrega),
    total: paraNumero(p.total),
    trocoPara: paraNumero(p.trocoPara),
  }
}
