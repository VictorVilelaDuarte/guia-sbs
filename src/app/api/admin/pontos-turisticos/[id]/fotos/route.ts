import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile, deleteFile } from "@/lib/supabase-storage"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 5 * 1024 * 1024
const MAX_FOTOS = 8

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
  return session
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  const ponto = await prisma.pontoTuristico.findUnique({ where: { id }, select: { fotos: true } })
  if (!ponto) return NextResponse.json({ error: "Ponto não encontrado." }, { status: 404 })

  if (ponto.fotos.length >= MAX_FOTOS) {
    return NextResponse.json({ error: `Limite de ${MAX_FOTOS} fotos atingido.` }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Use JPEG, PNG ou WebP." }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Máximo 5MB por foto." }, { status: 400 })

  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `pontos-turisticos/${id}/${Date.now()}.${ext}`
  const url = await uploadFile(path, file)

  const updated = await prisma.pontoTuristico.update({
    where: { id },
    data: { fotos: { push: url } },
    select: { fotos: true },
  })

  return NextResponse.json({ url, fotos: updated.fotos }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: "URL da foto obrigatória." }, { status: 400 })

  const ponto = await prisma.pontoTuristico.findUnique({ where: { id }, select: { fotos: true } })
  if (!ponto) return NextResponse.json({ error: "Ponto não encontrado." }, { status: 404 })

  const novasFotos = ponto.fotos.filter((f) => f !== url)
  await prisma.pontoTuristico.update({ where: { id }, data: { fotos: novasFotos } })

  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname.split("/object/public/comercios/")[1]
    if (path) await deleteFile(path)
  } catch {}

  return NextResponse.json({ fotos: novasFotos })
}
