import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { clientePodeCancelar } from "@/lib/pedidos"

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

  return NextResponse.json(pedido)
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
    select: { id: true, status: true },
  })
  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })

  if (!clientePodeCancelar(pedido.status)) {
    return NextResponse.json(
      { error: "Este pedido não pode mais ser cancelado." },
      { status: 409 },
    )
  }

  const atualizado = await prisma.pedido.update({
    where: { id: pedido.id },
    data: { status: "CANCELADO", motivoCancelamento: "Cancelado pelo cliente" },
    select: { status: true },
  })

  return NextResponse.json(atualizado)
}
