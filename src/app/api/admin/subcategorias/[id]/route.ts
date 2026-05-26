import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  nome: z.string().min(2).max(60).optional(),
  ativo: z.boolean().optional(),
  ordem: z.number().int().min(0).optional(),
})

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const subcategoria = await prisma.subcategoria.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(subcategoria)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  const count = await prisma.comercio.count({
    where: { subcategorias: { some: { id } } },
  })
  if (count > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${count} comércio(s) usam esta subcategoria.` },
      { status: 409 },
    )
  }

  await prisma.subcategoria.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
