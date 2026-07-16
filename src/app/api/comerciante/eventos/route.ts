import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { z } from "zod"

const createSchema = z.object({
  titulo:      z.string().min(1).max(150),
  descricao:   z.string().max(2000).optional().nullable(),
  dataInicio:  z.coerce.date(),
  dataFim:     z.coerce.date().optional().nullable(),
  imagem:      z.string().url().optional().nullable(),
  local:       z.string().max(200).optional().nullable(),
  preco:       z.number().min(0).optional().nullable(),
  linkExterno: z.string().url().optional().nullable(),
})

export async function GET() {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const eventos = await prisma.evento.findMany({
    where: { comercioId: ctx.comercioId },
    orderBy: { dataInicio: "asc" },
  })

  return NextResponse.json(eventos)
}

export async function POST(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    console.error("[POST /api/comerciante/eventos] Validação falhou:", parsed.error.flatten())
    return NextResponse.json(
      { error: "Dados inválidos.", detalhes: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const evento = await prisma.evento.create({
      data: { ...parsed.data, comercioId: ctx.comercioId },
    })
    return NextResponse.json(evento, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[POST /api/comerciante/eventos] Erro Prisma:", err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
