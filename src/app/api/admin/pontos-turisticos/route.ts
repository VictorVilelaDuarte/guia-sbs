import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { slugify } from "@/lib/slugify"

const createSchema = z.object({
  nome: z.string().min(2).max(120),
  categoria: z.enum(["MIRANTE", "TRILHA", "HISTORICO", "CACHOEIRA"]),
})

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
  return session
}

async function gerarSlugUnico(nome: string): Promise<string> {
  const base = slugify(nome)
  const existentes = await prisma.pontoTuristico.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  })
  if (!existentes.some((p) => p.slug === base)) return base
  let i = 2
  while (existentes.some((p) => p.slug === `${base}-${i}`)) i++
  return `${base}-${i}`
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const pontos = await prisma.pontoTuristico.findMany({
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
  })

  return NextResponse.json(pontos)
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const slug = await gerarSlugUnico(parsed.data.nome)

  const ponto = await prisma.pontoTuristico.create({
    data: {
      nome: parsed.data.nome,
      categoria: parsed.data.categoria,
      slug,
    },
  })

  return NextResponse.json(ponto, { status: 201 })
}
