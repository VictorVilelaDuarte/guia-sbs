import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
})

async function requireComerciante() {
  const session = await auth()
  if (!session) return null
  const role = session.user.role
  if (role !== "COMERCIANTE") return null
  return session
}

export async function POST(req: NextRequest) {
  const session = await requireComerciante()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const comercio = await prisma.comercio.findUnique({ where: { ownerId: session.user.id } })
  if (!comercio) return NextResponse.json({ error: "Comércio não encontrado." }, { status: 404 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const count = await prisma.foto.count({ where: { comercioId: comercio.id } })

  const foto = await prisma.foto.create({
    data: {
      url: parsed.data.url,
      alt: parsed.data.alt,
      ordem: count,
      comercioId: comercio.id,
    },
  })

  return NextResponse.json(foto, { status: 201 })
}
