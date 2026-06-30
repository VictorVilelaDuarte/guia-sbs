import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Catálogo canônico de bairros/áreas de entrega — gerência do admin.
// Ver docs/pedido-online.md (taxa de entrega por bairro).

const createSchema = z.object({
  nome: z.string().min(2).max(120),
  cidade: z.string().min(2).max(80),
  uf: z.string().length(2),
})

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const bairros = await prisma.bairro.findMany({
    orderBy: [{ cidade: "asc" }, { ordem: "asc" }, { nome: "asc" }],
    include: { _count: { select: { zonas: true } } },
  })

  return NextResponse.json(bairros)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const { nome, cidade, uf } = parsed.data

  const existe = await prisma.bairro.findUnique({
    where: { nome_cidade: { nome, cidade } },
  })
  if (existe) return NextResponse.json({ error: "Este bairro já existe nessa cidade." }, { status: 409 })

  const maxOrdem = await prisma.bairro.aggregate({
    where: { cidade },
    _max: { ordem: true },
  })

  const bairro = await prisma.bairro.create({
    data: { nome, cidade, uf: uf.toUpperCase(), ordem: (maxOrdem._max.ordem ?? -1) + 1 },
  })

  return NextResponse.json(bairro, { status: 201 })
}
