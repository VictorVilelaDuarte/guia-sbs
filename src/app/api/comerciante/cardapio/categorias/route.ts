import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { z } from "zod"

const createSchema = z.object({
  nome: z.string().min(1).max(80),
})

export async function POST(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })

  const count = await prisma.cardapioCategoria.count({ where: { comercioId: ctx.comercioId } })

  const categoria = await prisma.cardapioCategoria.create({
    data: { nome: parsed.data.nome, comercioId: ctx.comercioId, ordem: count },
    include: { produtos: true },
  })

  return NextResponse.json(categoria, { status: 201 })
}
