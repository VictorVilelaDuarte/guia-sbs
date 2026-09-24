import type { Viewport } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PedidoTracker, type PedidoData } from "./pedido-tracker"
import { paraNumero } from "@/lib/dinheiro"
import { serializarItens } from "@/lib/pedidos-serializar"

export const viewport: Viewport = {
  userScalable: false,
}

export const metadata = {
  title: "Acompanhar pedido",
  robots: { index: false, follow: false },
}

export default async function PaginaPedido({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const pedido = await prisma.pedido.findUnique({
    where: { token },
    include: {
      itens: {
        select: {
          id: true,
          titulo: true,
          variacaoNome: true,
          precoUnit: true,
          quantidade: true,
          observacao: true,
          complementos: { select: { id: true, nome: true, quantidade: true } },
        },
      },
      // Só status + horário: nome de quem mudou o status nunca vai para o cliente.
      historico: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
      comercio: {
        select: {
          nome: true,
          slug: true,
          logo: true,
          whatsapp: true,
          pedidoConfig: { select: { tempoPreparoMin: true } },
        },
      },
    },
  })

  if (!pedido) notFound()

  const dados: PedidoData = {
    token: pedido.token,
    numero: pedido.numero,
    status: pedido.status,
    tipoEntrega: pedido.tipoEntrega,
    clienteNome: pedido.clienteNome,
    cep: pedido.cep,
    endereco: pedido.endereco,
    numeroEnd: pedido.numeroEnd,
    bairro: pedido.bairro,
    complemento: pedido.complemento,
    referencia: pedido.referencia,
    formaPagamento: pedido.formaPagamento,
    trocoPara: paraNumero(pedido.trocoPara),
    observacoes: pedido.observacoes,
    subtotal: paraNumero(pedido.subtotal),
    taxaEntrega: paraNumero(pedido.taxaEntrega),
    total: paraNumero(pedido.total),
    motivoCancelamento: pedido.motivoCancelamento,
    createdAt: pedido.createdAt.toISOString(),
    itens: serializarItens(pedido.itens),
    historico: pedido.historico.map((h) => ({ status: h.status, createdAt: h.createdAt.toISOString() })),
    comercio: pedido.comercio,
  }

  return <PedidoTracker initial={dados} />
}
