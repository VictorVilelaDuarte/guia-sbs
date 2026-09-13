import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { vinculosValidos } from "@/lib/comercio-ctx"
import { COMERCIO_ATIVO_COOKIE } from "@/lib/comercio-ativo-cookie"

const schema = z.object({ comercioId: z.string().min(1) })

// Troca a loja ativa do painel (seletor do cabeçalho). Só aceita comércio com
// vínculo válido do usuário. O cookie não autoriza nada sozinho: getComercioCtx()
// revalida o vínculo a cada request.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const validos = await vinculosValidos(session.user.id)
  if (!validos?.some((m) => m.comercio.id === parsed.data.comercioId)) {
    return NextResponse.json({ error: "Você não tem acesso a este comércio." }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COMERCIO_ATIVO_COOKIE, parsed.data.comercioId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // a escolha persiste entre sessões
  })
  return res
}
