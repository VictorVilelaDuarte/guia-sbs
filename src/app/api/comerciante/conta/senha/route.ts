import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(8).max(100),
})

// Troca da própria senha. Usa a sessão diretamente (não getComercioCtx): precisa
// funcionar justamente quando o usuário ainda está com senha temporária e o ctx
// está bloqueado. Desliga `trocarSenha`.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const senhaCurta = parsed.error.issues.some((i) => i.path[0] === "novaSenha" && i.code === "too_small")
    return NextResponse.json(
      { error: senhaCurta ? "A nova senha precisa ter pelo menos 8 caracteres." : "Dados inválidos." },
      { status: 400 },
    )
  }
  const { senhaAtual, novaSenha } = parsed.data

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  })
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  if (!(await bcrypt.compare(senhaAtual, user.password))) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 })
  }
  if (senhaAtual === novaSenha) {
    return NextResponse.json({ error: "A nova senha precisa ser diferente da atual." }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(novaSenha, 10), trocarSenha: false },
  })
  return NextResponse.json({ ok: true })
}
