import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { deleteFile } from "@/lib/supabase-storage"

const patchSchema = z.object({
  titulo: z.string().min(1).max(120).optional(),
  descricao: z.string().max(1000).optional().nullable(),
  preco: z.number().positive().optional().nullable(),
  imagem: z.string().url().optional().nullable(),
  disponivel: z.boolean().optional(),
})

async function ownerCheck(produtoId: string) {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null

  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
    include: { comercio: { select: { ownerId: true } } },
  })

  if (!produto || produto.comercio.ownerId !== session.user.id) return null
  return produto
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const produto = await ownerCheck(id)
  if (!produto) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const updated = await prisma.produto.update({
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
  const produto = await ownerCheck(id)
  if (!produto) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  if (produto.imagem) {
    const url = new URL(produto.imagem)
    const path = url.pathname.split("/object/public/comercios/")[1]
    if (path) await deleteFile(path).catch(() => {})
  }

  await prisma.produto.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
