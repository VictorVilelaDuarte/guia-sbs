import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteFile } from "@/lib/supabase-storage"

async function requireComerciante() {
  const session = await auth()
  if (!session) return null
  const role = session.user.role
  if (role !== "COMERCIANTE") return null
  return session
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireComerciante()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  const foto = await prisma.foto.findUnique({
    where: { id },
    include: { comercio: { select: { ownerId: true } } },
  })

  if (!foto || foto.comercio.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 })
  }

  await prisma.foto.delete({ where: { id } })

  // Remove from Supabase Storage (best-effort)
  try {
    const url = new URL(foto.url)
    const path = url.pathname.split("/object/public/comercios/")[1]
    if (path) await deleteFile(path)
  } catch {}

  return new NextResponse(null, { status: 204 })
}
