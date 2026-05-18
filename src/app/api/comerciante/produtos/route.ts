import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  titulo: z.string().min(1).max(120),
  descricao: z.string().max(1000).optional(),
  preco: z.number().positive().optional(),
  imagem: z.string().url().optional(),
  disponivel: z.boolean().optional(),
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

export async function GET() {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const produtos = await prisma.produto.findMany({
    where: { comercioId: ctx.comercioId },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json(produtos)
}

export async function POST(req: NextRequest) {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const count = await prisma.produto.count({ where: { comercioId: ctx.comercioId } })

  const produto = await prisma.produto.create({
    data: { ...parsed.data, comercioId: ctx.comercioId, ordem: count },
  })

  return NextResponse.json(produto, { status: 201 })
}
