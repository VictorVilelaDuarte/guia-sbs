import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { MAX_PERCENTUAL_SERVICO } from "@/lib/gestao/totais"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

// Configuração do PDV da loja: taxa de serviço sugerida (null = desligada).
// Fica no PedidoConfig (criado sob demanda, sem ligar o pedido online).
const schema = z.object({
  taxaServicoPct: z.number().positive().max(MAX_PERCENTUAL_SERVICO).nullable(),
})

export async function PATCH(req: NextRequest) {
  const g = await guardPdv("pedidos:configurar")
  if ("resposta" in g) return g.resposta
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: `A taxa de serviço vai de 0,01% a ${MAX_PERCENTUAL_SERVICO}%.` }, { status: 400 })
  const { comercioId } = g.ctx
  return responder(async () => {
    await prisma.pedidoConfig.createMany({ data: [{ comercioId, aceitaPedidos: false, formasPagamento: [] }], skipDuplicates: true })
    await prisma.pedidoConfig.update({ where: { comercioId }, data: { taxaServicoPct: parsed.data.taxaServicoPct } })
    return { taxaServicoPct: parsed.data.taxaServicoPct }
  })
}
