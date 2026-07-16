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

  const categoria = await prisma.catalogoCategoria.findUnique({
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

  const updated = await prisma.catalogoCategoria.update({
    where: { id },
    data: parsed.data,
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

  // Categoria é opcional: excluir não apaga os itens. O onDelete: SetNull no
  // Produto desvincula os itens, que voltam para o bloco "Outros".
  await prisma.catalogoCategoria.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
