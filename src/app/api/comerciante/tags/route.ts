import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import { z } from "zod"
import { negarLimiteTags } from "@/lib/plan-limites"

export async function GET() {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const negado = negarSemPermissao(ctx, "vitrine:editar")
  if (negado) return negado

  const tags = await prisma.tag.findMany({
    where: { comercioId: ctx.comercioId },
    orderBy: { createdAt: "asc" },
    select: { id: true, nome: true },
  })

  return NextResponse.json(tags)
}

export async function POST(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const negado = negarSemPermissao(ctx, "vitrine:editar")
  if (negado) return negado

  const body = await req.json()
  const parsed = z.object({ nome: z.string().min(1).max(40) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Tag inválida." }, { status: 400 })

  const nome = parsed.data.nome.toLowerCase().trim()

  const limite = await negarLimiteTags(ctx.comercioId, ctx.features)
  if (limite) return limite

  try {
    const tag = await prisma.tag.create({
      data: { nome, comercioId: ctx.comercioId },
      select: { id: true, nome: true },
    })
    return NextResponse.json(tag, { status: 201 })
  } catch {
    // unique constraint → tag já existe
    return NextResponse.json({ error: "Tag já cadastrada." }, { status: 409 })
  }
}
