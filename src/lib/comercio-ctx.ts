import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { PapelMembro } from "@prisma/client"
import { ADMIN_COMERCIO_COOKIE } from "@/lib/admin-comercio-cookie"
import { COMERCIO_ATIVO_COOKIE } from "@/lib/comercio-ativo-cookie"
import { permissoesDo, temPermissao, type Permissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"

export interface ComercioCtx {
  comercioId: string
  // Titular cadastrado pelo admin. NÃO usar para autorização (não é único e não
  // representa quem está logado) — autorize comparando comercioId.
  ownerId: string
  isAdmin: boolean
  features: unknown
  // Usuário da sessão (o admin, quando isAdmin).
  userId: string
  // Papel do usuário no comércio; null quando isAdmin.
  papel: PapelMembro | null
}

const comercioSelect = {
  id: true,
  nome: true,
  ownerId: true,
  plan: { select: { features: true } },
} as const

// Vínculos que dão acesso ao painel, do mais antigo ao mais novo. `null` quando
// o usuário está com senha temporária (sem acesso a nada até trocar).
// Vínculo não-DONO só vale se o plano do comércio tiver `gestao_equipe` — sem a
// flag, o vínculo fica guardado e volta a valer se o plano voltar.
export async function vinculosValidos(userId: string) {
  const [user, membros] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { trocarSenha: true } }),
    prisma.comercioMembro.findMany({
      where: { userId, ativo: true },
      orderBy: { createdAt: "asc" },
      select: { papel: true, comercio: { select: comercioSelect } },
    }),
  ])
  if (!user || user.trocarSenha) return null
  return membros.filter(
    (m) => m.papel === "DONO" || temFeature(m.comercio.plan.features, "gestao_equipe"),
  )
}

// Resolve o comércio-alvo das páginas e rotas /api/comerciante/*:
// - COMERCIANTE → pelo vínculo válido em ComercioMembro (a fonte de verdade de
//   acesso — ver docs/modulo-gestao.md, Fase 1). Com mais de um (dono de várias
//   lojas), vale a loja do cookie comercio_ativo SE houver vínculo válido com ela;
//   senão, a mais antiga. Cookie forjado ou de loja sem acesso é ignorado.
// - ADMIN/SUPER_ADMIN → o comércio do cookie admin_comercio_id, permitindo que o
//   admin gerencie qualquer comércio pelo mesmo painel e pelas mesmas rotas.
//   O cookie só é honrado para admins — forjado por outro role, é ignorado.
export async function getComercioCtx(): Promise<ComercioCtx | null> {
  const session = await auth()
  if (!session) return null
  const role = session.user.role
  const userId = session.user.id

  if (role === "COMERCIANTE") {
    // Senha temporária ainda não trocada: sem acesso ao painel nem às APIs
    // (esconder só a tela não bastaria — a API seria chamável direto).
    const [validos, jar] = await Promise.all([vinculosValidos(userId), cookies()])
    if (!validos || validos.length === 0) return null
    const ativo = jar.get(COMERCIO_ATIVO_COOKIE)?.value
    const membro = validos.find((m) => m.comercio.id === ativo) ?? validos[0]
    return {
      comercioId: membro.comercio.id,
      ownerId: membro.comercio.ownerId,
      isAdmin: false,
      features: membro.comercio.plan.features,
      userId,
      papel: membro.papel,
    }
  }

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    const comercioId = (await cookies()).get(ADMIN_COMERCIO_COOKIE)?.value
    if (!comercioId) return null
    const comercio = await prisma.comercio.findUnique({
      where: { id: comercioId },
      select: comercioSelect,
    })
    if (!comercio) return null
    return {
      comercioId: comercio.id,
      ownerId: comercio.ownerId,
      isAdmin: true,
      features: comercio.plan.features,
      userId,
      papel: null,
    }
  }

  return null
}

// Permissões do usuário no comércio do contexto (admin: todas).
export function permissoesCtx(ctx: ComercioCtx): readonly Permissao[] {
  return permissoesDo(ctx.isAdmin ? null : ctx.papel)
}

// Verdadeiro se o contexto tem ALGUMA das permissões pedidas.
export function pode(ctx: ComercioCtx, ...alguma: Permissao[]): boolean {
  return temPermissao(permissoesCtx(ctx), ...alguma)
}

// Guard das rotas de API: devolve a resposta 403 quando falta permissão, ou
// null para seguir. Uso: `const negado = negarSemPermissao(ctx, "x"); if (negado) return negado`.
export function negarSemPermissao(ctx: ComercioCtx, ...alguma: Permissao[]): NextResponse | null {
  if (pode(ctx, ...alguma)) return null
  return NextResponse.json({ error: "Seu papel neste comércio não permite esta ação." }, { status: 403 })
}
