import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { z } from "zod"

const patchSchema = z.object({
  nome: z.string().min(1).max(80).optional(),
})

async function ownerCheck(categoriaId: string) {
  const ctx = await getComercioCtx()
  if (!ctx) return null

  const categoria = await prisma.cardapioCategoria.findUnique({
    where: { id: categoriaId },
    include: { comercio: { select: { ownerId: true } } },
  })

  if (!categoria || categoria.comercio.ownerId !== ctx.ownerId) return null
  return categoria
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const categoria = await ownerCheck(id)
  if (!categoria) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })

  const updated = await prisma.cardapioCategoria.update({
    where: { id },
    data: parsed.data,
    include: { produtos: { orderBy: { ordem: "asc" } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const categoria = await ownerCheck(id)
  if (!categoria) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  // Itens e suas imagens são deletados via cascade no banco.
  // Imagens no storage ficam órfãs — aceitável por ora.
  await prisma.cardapioCategoria.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
