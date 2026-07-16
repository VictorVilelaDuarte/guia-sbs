import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { z } from "zod"
import { FORMA_PAGAMENTO_KEYS } from "@/lib/hospedagem"

// Taxa de entrega e bairros saíram daqui — agora vivem em ZonaEntrega
// (taxa por bairro). Ver PUT /api/comerciante/zonas-entrega.
const configSchema = z.object({
  aceitaPedidos: z.boolean().optional(),
  entregaAtiva: z.boolean().optional(),
  retiradaAtiva: z.boolean().optional(),
  pedidoMinimo: z.number().nonnegative().optional(),
  tempoPreparoMin: z.number().int().positive().max(600).optional().nullable(),
  formasPagamento: z.array(z.enum(FORMA_PAGAMENTO_KEYS as [string, ...string[]])).optional(),
})

export async function PUT(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = configSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })
  }

  const data = {
    aceitaPedidos: parsed.data.aceitaPedidos ?? false,
    entregaAtiva: parsed.data.entregaAtiva ?? true,
    retiradaAtiva: parsed.data.retiradaAtiva ?? true,
    pedidoMinimo: parsed.data.pedidoMinimo ?? 0,
    tempoPreparoMin: parsed.data.tempoPreparoMin ?? null,
    formasPagamento: parsed.data.formasPagamento ?? [],
  }

  const config = await prisma.pedidoConfig.upsert({
    where: { comercioId: ctx.comercioId },
    create: { comercioId: ctx.comercioId, ...data },
    update: data,
  })

  return NextResponse.json(config)
}
