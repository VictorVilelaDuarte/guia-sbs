import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { z } from "zod"

const createSchema = z.object({
  nome: z.string().min(1).max(80),
  tipo: z.enum(["PRODUTO", "SERVICO"]),
})

export async function POST(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })

  // ordem é por tipo — cada aba tem sua própria sequência de categorias
  const count = await prisma.catalogoCategoria.count({
    where: { comercioId: ctx.comercioId, tipo: parsed.data.tipo },
  })

  const categoria = await prisma.catalogoCategoria.create({
    data: { nome: parsed.data.nome, tipo: parsed.data.tipo, comercioId: ctx.comercioId, ordem: count },
  })

  return NextResponse.json(categoria, { status: 201 })
}
