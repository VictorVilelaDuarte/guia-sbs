import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import { deleteFile } from "@/lib/supabase-storage"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const negado = negarSemPermissao(ctx, "vitrine:editar")
  if (negado) return negado

  const { id } = await params
  const foto = await prisma.foto.findUnique({
    where: { id },
  })

  if (!foto || foto.comercioId !== ctx.comercioId) {
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
