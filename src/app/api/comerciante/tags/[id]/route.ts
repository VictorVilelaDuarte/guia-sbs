import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: { comercio: { select: { ownerId: true } } },
  })

  if (!tag) return NextResponse.json({ error: "Tag não encontrada." }, { status: 404 })

  if (tag.comercio.ownerId !== ctx.ownerId) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 })
  }

  await prisma.tag.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
