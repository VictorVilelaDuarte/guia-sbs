import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireComerciante() {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null
  return session
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireComerciante()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: { comercio: { select: { ownerId: true } } },
  })

  if (!tag) return NextResponse.json({ error: "Tag não encontrada." }, { status: 404 })

  if (tag.comercio.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 })
  }

  await prisma.tag.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
