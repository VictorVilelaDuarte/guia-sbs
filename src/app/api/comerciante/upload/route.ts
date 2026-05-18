import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile } from "@/lib/supabase-storage"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

async function requireComerciante() {
  const session = await auth()
  if (!session) return null
  const role = session.user.role
  if (role !== "COMERCIANTE") return null
  return session
}

export async function POST(req: NextRequest) {
  const session = await requireComerciante()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file")
  const tipo = formData.get("tipo") as string

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP." }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 5MB." }, { status: 400 })
  }

  const userId = session.user.id
  const ext = file.name.split(".").pop() ?? "jpg"
  const path =
    tipo === "logo"
      ? `${userId}/logo.${ext}`
      : tipo === "produto"
      ? `${userId}/produtos/${Date.now()}.${ext}`
      : tipo === "evento"
      ? `${userId}/eventos/${Date.now()}.${ext}`
      : `${userId}/fotos/${Date.now()}.${ext}`

  const url = await uploadFile(path, file)
  return NextResponse.json({ url })
}
