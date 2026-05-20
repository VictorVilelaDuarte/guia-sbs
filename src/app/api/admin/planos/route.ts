import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens."),
  nome: z.string().min(2),
  descricao: z.string().optional(),
  preco: z.number().min(0),
  features: z.record(z.string(), z.boolean()).default({}),
  ordem: z.number().int().default(0),
})

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") return null
  return session
}

export async function GET() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const planos = await prisma.plan.findMany({
    orderBy: { ordem: "asc" },
    include: { _count: { select: { comercios: true } } },
  })

  return NextResponse.json(planos)
}

export async function POST(req: NextRequest) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: "Apenas Super Admins podem criar planos." }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const existe = await prisma.plan.findUnique({ where: { slug: parsed.data.slug } })
  if (existe) {
    return NextResponse.json({ error: "Já existe um plano com este slug." }, { status: 409 })
  }

  const plano = await prisma.plan.create({ data: parsed.data })
  return NextResponse.json(plano, { status: 201 })
}
