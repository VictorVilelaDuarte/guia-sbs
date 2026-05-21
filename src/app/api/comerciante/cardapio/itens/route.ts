import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  titulo: z.string().min(1).max(120),
  descricao: z.string().max(1000).optional().nullable(),
  preco: z.number().positive().optional().nullable(),
  imagem: z.string().url().optional().nullable(),
  disponivel: z.boolean().optional(),
  categoriaId: z.string(),
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

  // Verifica que a categoria pertence ao comércio
  const categoria = await prisma.cardapioCategoria.findUnique({
    where: { id: parsed.data.categoriaId },
    select: { comercioId: true },
  })
  if (!categoria || categoria.comercioId !== ctx.comercioId) {
    return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
  }

  const count = await prisma.cardapioItem.count({ where: { categoriaId: parsed.data.categoriaId } })

  const item = await prisma.cardapioItem.create({
    data: { ...parsed.data, comercioId: ctx.comercioId, ordem: count },
  })

  return NextResponse.json(item, { status: 201 })
}
