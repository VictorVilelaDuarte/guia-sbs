import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { slugify } from "@/lib/slugify"
import { violaFuncionarioUnico } from "@/lib/gestao/equipe"

const CATEGORIAS_ENUM = ["ALIMENTACAO", "HOSPEDAGEM", "TURISMO", "SERVICO", "COMERCIO", "ENTRETENIMENTO"] as const

const createSchema = z.object({
  nome: z.string().min(2),
  categorias: z.array(z.enum(CATEGORIAS_ENUM)).min(1),
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
    select: { id: true, role: true },
  })
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
  if (user.role !== "COMERCIANTE") {
    return NextResponse.json({ error: "O responsável precisa ser um comerciante." }, { status: 400 })
  }
  // Dono pode ter várias lojas (troca pelo seletor do painel); funcionário de
  // outro comércio não pode virar titular. Comércio novo ainda não tem id: "".
  const violacao = await violaFuncionarioUnico(user.id, "", "DONO")
  if (violacao) return NextResponse.json({ error: violacao }, { status: 409 })

  const planFree = await prisma.plan.findUnique({ where: { slug: "free" } })
  if (!planFree) return NextResponse.json({ error: "Plano padrão não encontrado. Execute o seed." }, { status: 500 })

  const base = slugify(parsed.data.nome)
  let slug = base
  let count = 1
  while (await prisma.comercio.findUnique({ where: { slug } })) {
    slug = `${base}-${count++}`
  }

  // Comércio e vínculo DONO nascem juntos: sem o vínculo, o titular não acessa
  // o painel (getComercioCtx resolve por ComercioMembro).
  const comercio = await prisma.comercio.create({
    data: {
      slug,
      nome: parsed.data.nome,
      categorias: parsed.data.categorias,
      descricao: parsed.data.descricao,
      ownerId: parsed.data.ownerId,
      planId: planFree.id,
      membros: { create: { userId: parsed.data.ownerId, papel: "DONO" } },
    },
  })

  return NextResponse.json({ id: comercio.id }, { status: 201 })
}
