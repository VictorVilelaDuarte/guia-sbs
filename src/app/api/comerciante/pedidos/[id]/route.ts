import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import type { Permissao } from "@/lib/gestao/permissoes"
import { z } from "zod"
import { PedidoStatus } from "@prisma/client"
import { podeTransicionar, exigeMotivo } from "@/lib/pedidos"

const patchSchema = z.object({
  status: z.enum(Object.values(PedidoStatus) as [string, ...string[]]),
  motivoCancelamento: z.string().max(280).optional().nullable(),
})

async function ownerCheck(pedidoId: string, ...permissoes: Permissao[]) {
  const ctx = await getComercioCtx()
  if (!ctx) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  const negado = negarSemPermissao(ctx, ...permissoes)
  if (negado) return { erro: negado }

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    select: {
      id: true,
      status: true,
      tipoEntrega: true,
      comercioId: true,
    },
  })
  if (!pedido || pedido.comercioId !== ctx.comercioId) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  return { item: pedido, ctx }
}

// Comerciante avança o status do pedido, validado pela máquina de estados.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const check = await ownerCheck(id, "pedidos:operar")
  if ("erro" in check) return check.erro
  const pedido = check.item

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const novoStatus = parsed.data.status as PedidoStatus

  if (novoStatus === pedido.status) {
    return NextResponse.json({ error: "O pedido já está nesse status." }, { status: 409 })
  }
  if (!podeTransicionar(pedido.status, novoStatus, pedido.tipoEntrega)) {
    return NextResponse.json(
      { error: `Transição inválida: ${pedido.status} → ${novoStatus}.` },
      { status: 409 },
    )
  }
  if (exigeMotivo(novoStatus) && !parsed.data.motivoCancelamento?.trim()) {
    return NextResponse.json({ error: "Informe o motivo." }, { status: 400 })
  }

  const atualizado = await prisma.pedido.update({
    where: { id },
    data: {
      status: novoStatus,
      motivoCancelamento: exigeMotivo(novoStatus)
        ? parsed.data.motivoCancelamento!.trim()
        : null,
    },
  })

  return NextResponse.json(atualizado)
}
