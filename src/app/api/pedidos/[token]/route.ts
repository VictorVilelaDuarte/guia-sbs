import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { clientePodeCancelar } from "@/lib/pedidos"
import { mudarStatusPedido } from "@/lib/pedidos-historico"
import { serializarItens, serializarValores } from "@/lib/pedidos-serializar"

// Rota PÚBLICA — o `token` (cuid não-adivinhável) é a credencial de acesso.
// GET: dados de acompanhamento. PATCH: cliente cancela (só enquanto AGUARDANDO).

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const pedido = await prisma.pedido.findUnique({
    where: { token },
    select: {
      token: true,
      numero: true,
      status: true,
      tipoEntrega: true,
      clienteNome: true,
      cep: true,
      endereco: true,
      numeroEnd: true,
      bairro: true,
      complemento: true,
      referencia: true,
      formaPagamento: true,
      trocoPara: true,
      observacoes: true,
      subtotal: true,
      taxaEntrega: true,
      total: true,
      motivoCancelamento: true,
      createdAt: true,
      updatedAt: true,
      // Só status + horário: nome de quem mudou o status nunca vai para o cliente.
      historico: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
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

  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })

  // Decimal → number (o tracker do cliente faz polling desta rota).
  return NextResponse.json({ ...serializarValores(pedido), itens: serializarItens(pedido.itens) })
}

const patchSchema = z.object({ acao: z.literal("cancelar") })

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Ação inválida." }, { status: 400 })

  const pedido = await prisma.pedido.findUnique({
    where: { token },
    select: { id: true, status: true, clienteNome: true },
  })
  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })

  if (!clientePodeCancelar(pedido.status)) {
    return NextResponse.json(
      { error: "Este pedido não pode mais ser cancelado." },
      { status: 409 },
    )
  }

  // Condicional ao status lido: se a loja aceitou no mesmo instante, o
  // cancelamento não sobrescreve o aceite.
  const resultado = await mudarStatusPedido({
    pedidoId: pedido.id,
    de: pedido.status,
    para: "CANCELADO",
    motivo: "Cancelado pelo cliente",
    origem: "CLIENTE",
    autorNome: pedido.clienteNome,
  })
  if (resultado === "conflito") {
    return NextResponse.json(
      { error: "A loja acabou de atualizar este pedido. Confira o status antes de cancelar." },
      { status: 409 },
    )
  }

  return NextResponse.json({ status: "CANCELADO" })
}
