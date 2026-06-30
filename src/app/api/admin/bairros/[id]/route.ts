import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  cidade: z.string().min(2).max(80).optional(),
  uf: z.string().length(2).optional(),
  ativo: z.boolean().optional(),
})

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const data = { ...parsed.data }
  if (data.uf) data.uf = data.uf.toUpperCase()

  const bairro = await prisma.bairro.update({ where: { id }, data })
  return NextResponse.json(bairro)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  // onDelete: SetNull nas zonas — excluir do catálogo não quebra as áreas já
  // configuradas pelas lojas (elas guardam nome/cidade/uf denormalizados).
  await prisma.bairro.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
