import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { z } from "zod"

const createSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const count = await prisma.foto.count({ where: { comercioId: ctx.comercioId } })

  const foto = await prisma.foto.create({
    data: {
      url: parsed.data.url,
      alt: parsed.data.alt,
      ordem: count,
      comercioId: ctx.comercioId,
    },
  })

  return NextResponse.json(foto, { status: 201 })
}
