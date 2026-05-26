import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  nome: z.string().min(1).max(80),
})

async function getComerciante() {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null
  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  return comercio ? { userId: session.user.id, comercioId: comercio.id } : null
}

export async function POST(req: NextRequest) {
  const ctx = await getComerciante()
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
