import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import type { Permissao } from "@/lib/gestao/permissoes"
import { uploadFile } from "@/lib/supabase-storage"

// Permissão exigida pelo destino do arquivo (tipo omitido = foto da vitrine).
function permissoesDoTipo(tipo: string | null): Permissao[] {
  if (tipo === "produto" || tipo === "cardapio") return ["cardapio:editar", "catalogo:editar"]
  if (tipo === "quarto") return ["quartos:editar"]
  return ["vitrine:editar"] // logo, evento, fotos
}

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

  // Pasta do storage = id do comércio. Arquivos antigos ficaram em {ownerId}/...
  // e continuam válidos (a URL completa está salva no banco); pastas por titular
  // colidiriam quando um usuário é titular de mais de uma loja (ex.: logo.png).
  let pasta: string
  if (isAdmin && comercioId) {
    const comercio = await prisma.comercio.findUnique({
      where: { id: comercioId },
      select: { id: true },
    })
    if (!comercio) return NextResponse.json({ error: "Comércio não encontrado." }, { status: 404 })
    pasta = comercio.id
  } else {
    // comerciante no próprio painel, ou admin no painel de gestão (cookie)
    const ctx = await getComercioCtx()
    if (!ctx) return NextResponse.json({ error: "Comércio não encontrado." }, { status: 404 })
    const negado = negarSemPermissao(ctx, ...permissoesDoTipo(tipo))
    if (negado) return negado
    pasta = ctx.comercioId
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const path =
    tipo === "logo"
      ? `${pasta}/logo.${ext}`
      : tipo === "produto"
      ? `${pasta}/produtos/${Date.now()}.${ext}`
      : tipo === "evento"
      ? `${pasta}/eventos/${Date.now()}.${ext}`
      : tipo === "cardapio"
      ? `${pasta}/cardapio/${Date.now()}.${ext}`
      : tipo === "quarto"
      ? `${pasta}/quartos/${Date.now()}.${ext}`
      : `${pasta}/fotos/${Date.now()}.${ext}`

  const url = await uploadFile(path, file)
  return NextResponse.json({ url })
}
