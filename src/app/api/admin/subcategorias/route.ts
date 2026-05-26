import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { Categoria } from "@prisma/client"

const CATEGORIAS_VALIDAS: Categoria[] = [
  "ALIMENTACAO", "HOSPEDAGEM", "TURISMO", "SERVICO", "COMERCIO", "ENTRETENIMENTO",
]

const createSchema = z.object({
  nome: z.string().min(2).max(60),
  categoria: z.enum(["ALIMENTACAO", "HOSPEDAGEM", "TURISMO", "SERVICO", "COMERCIO", "ENTRETENIMENTO"]),
})

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const subcategorias = await prisma.subcategoria.findMany({
    orderBy: [{ categoria: "asc" }, { ordem: "asc" }, { nome: "asc" }],
    include: { _count: { select: { comercios: true } } },
  })

  return NextResponse.json(subcategorias)
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const maxOrdem = await prisma.subcategoria.aggregate({
    where: { categoria: parsed.data.categoria },
    _max: { ordem: true },
  })

  const subcategoria = await prisma.subcategoria.create({
    data: {
      nome: parsed.data.nome,
      categoria: parsed.data.categoria,
      ordem: (maxOrdem._max.ordem ?? -1) + 1,
    },
  })

  return NextResponse.json(subcategoria, { status: 201 })
}
