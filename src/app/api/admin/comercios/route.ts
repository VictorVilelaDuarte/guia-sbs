import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { slugify } from "@/lib/slugify"

const createSchema = z.object({
  nome: z.string().min(2),
  categoria: z.enum(["ALIMENTACAO", "HOSPEDAGEM", "TURISMO", "SERVICO", "COMERCIO", "ENTRETENIMENTO"]),
  ownerId: z.string(),
  descricao: z.string().optional(),
})

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
  return session
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.ownerId },
    include: { comercio: true },
  })
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
  if (user.comercio) return NextResponse.json({ error: "Usuário já possui comércio vinculado." }, { status: 409 })

  const planFree = await prisma.plan.findUnique({ where: { slug: "free" } })
  if (!planFree) return NextResponse.json({ error: "Plano padrão não encontrado. Execute o seed." }, { status: 500 })

  const base = slugify(parsed.data.nome)
  let slug = base
  let count = 1
  while (await prisma.comercio.findUnique({ where: { slug } })) {
    slug = `${base}-${count++}`
  }

  const comercio = await prisma.comercio.create({
    data: {
      slug,
      nome: parsed.data.nome,
      categoria: parsed.data.categoria,
      descricao: parsed.data.descricao,
      ownerId: parsed.data.ownerId,
      planId: planFree.id,
    },
  })

  return NextResponse.json({ id: comercio.id }, { status: 201 })
}
