import type { Viewport } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PedidoTracker, type PedidoData } from "./pedido-tracker"

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
        },
      },
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
    trocoPara: pedido.trocoPara,
    observacoes: pedido.observacoes,
    subtotal: pedido.subtotal,
    taxaEntrega: pedido.taxaEntrega,
    total: pedido.total,
    motivoCancelamento: pedido.motivoCancelamento,
    createdAt: pedido.createdAt.toISOString(),
    itens: pedido.itens,
    comercio: pedido.comercio,
  }

  return <PedidoTracker initial={dados} />
}
