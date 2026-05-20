import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  nome: z.string().min(2).optional(),
  descricao: z.string().optional(),
  preco: z.number().min(0).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  ativo: z.boolean().optional(),
  ordem: z.number().int().optional(),
})

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") return null
  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: "Apenas Super Admins podem editar planos." }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const plano = await prisma.plan.update({ where: { id }, data: parsed.data })
  return NextResponse.json(plano)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: "Apenas Super Admins podem excluir planos." }, { status: 403 })
  }

  const { id } = await params

  const count = await prisma.comercio.count({ where: { planId: id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${count} comércio(s) usam este plano.` },
      { status: 409 }
    )
  }

  await prisma.plan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
