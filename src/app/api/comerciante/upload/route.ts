import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/supabase-storage"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const role = session.user.role
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
  const isComerciante = role === "COMERCIANTE"

  if (!isAdmin && !isComerciante) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file")
  const tipo = formData.get("tipo") as string
  // admins passam comercioId para fazer upload no caminho correto
  const comercioId = formData.get("comercioId") as string | null

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP." }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 5MB." }, { status: 400 })
  }

  let userId: string
  if (isAdmin && comercioId) {
    const comercio = await prisma.comercio.findUnique({
      where: { id: comercioId },
      select: { ownerId: true },
    })
    if (!comercio) return NextResponse.json({ error: "Comércio não encontrado." }, { status: 404 })
    userId = comercio.ownerId
  } else {
    const comercio = await prisma.comercio.findUnique({
      where: { ownerId: session.user.id },
      select: { ownerId: true },
    })
    if (!comercio) return NextResponse.json({ error: "Comércio não encontrado." }, { status: 404 })
    userId = session.user.id
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const path =
    tipo === "logo"
      ? `${userId}/logo.${ext}`
      : tipo === "produto"
      ? `${userId}/produtos/${Date.now()}.${ext}`
      : tipo === "evento"
      ? `${userId}/eventos/${Date.now()}.${ext}`
      : tipo === "cardapio"
      ? `${userId}/cardapio/${Date.now()}.${ext}`
      : `${userId}/fotos/${Date.now()}.${ext}`

  const url = await uploadFile(path, file)
  return NextResponse.json({ url })
}
