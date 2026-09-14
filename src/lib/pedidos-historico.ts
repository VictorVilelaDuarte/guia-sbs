import type { OrigemHistorico, PedidoStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { exigeMotivo } from "@/lib/pedidos"

// Toda mudança de status de pedido passa por aqui (painel e cliente). Faz duas
// coisas numa transação só: a mudança e o registro no histórico — nunca existe
// status sem registro, nem registro sem status.
//
// Concorrência: a gravação exige que o status AINDA seja o lido (`de`). Dois
// atendentes aceitando o mesmo pedido, ou o cliente cancelando no instante em que
// a loja aceita, não sobrescrevem um ao outro: o segundo recebe "conflito".
export async function mudarStatusPedido(args: {
  pedidoId: string
  de: PedidoStatus
  para: PedidoStatus
  motivo: string | null
  origem: OrigemHistorico
  userId?: string | null
  autorNome?: string | null
}): Promise<"ok" | "conflito"> {
  const motivo = exigeMotivo(args.para) ? args.motivo : null
  return prisma.$transaction(async (tx) => {
    const r = await tx.pedido.updateMany({
      where: { id: args.pedidoId, status: args.de },
      data: { status: args.para, motivoCancelamento: motivo },
    })
    if (r.count === 0) return "conflito"
    await tx.pedidoHistorico.create({
      data: {
        pedidoId: args.pedidoId,
        status: args.para,
        origem: args.origem,
        userId: args.userId ?? null,
        autorNome: args.autorNome ?? null,
        motivo,
      },
    })
    return "ok"
  })
}

// Seleção do histórico para o painel (com autor). A página pública do cliente usa
// só { status, createdAt } — nunca autorNome/origem/userId.
export const historicoPainelSelect = {
  orderBy: { createdAt: "asc" as const },
  select: { id: true, status: true, origem: true, autorNome: true, motivo: true, descricao: true, createdAt: true },
}
