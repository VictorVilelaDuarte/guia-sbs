import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

async function requireComerciante() {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null
  return session
}

export async function GET() {
  const session = await requireComerciante()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!comercio) return NextResponse.json({ error: "Comércio não encontrado." }, { status: 404 })

  const tags = await prisma.tag.findMany({
    where: { comercioId: comercio.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, nome: true },
  })

  return NextResponse.json(tags)
}

export async function POST(req: NextRequest) {
  const session = await requireComerciante()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = z.object({ nome: z.string().min(1).max(40) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Tag inválida." }, { status: 400 })

  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!comercio) return NextResponse.json({ error: "Comércio não encontrado." }, { status: 404 })

  const nome = parsed.data.nome.toLowerCase().trim()

  try {
    const tag = await prisma.tag.create({
      data: { nome, comercioId: comercio.id },
      select: { id: true, nome: true },
    })
    return NextResponse.json(tag, { status: 201 })
  } catch {
    // unique constraint → tag já existe
    return NextResponse.json({ error: "Tag já cadastrada." }, { status: 409 })
  }
}
