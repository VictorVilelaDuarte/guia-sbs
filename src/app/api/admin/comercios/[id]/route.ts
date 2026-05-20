import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  status: z.enum(["PENDENTE", "ATIVO", "INATIVO", "REJEITADO"]).optional(),
  planSlug: z.string().optional(),
})

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const { status, planSlug } = parsed.data

  let planId: string | undefined
  if (planSlug) {
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } })
    if (!plan) return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 })
    planId = plan.id
  }

  const comercio = await prisma.comercio.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(planId ? { planId } : {}),
    },
  })

  return NextResponse.json({ id: comercio.id })
}
