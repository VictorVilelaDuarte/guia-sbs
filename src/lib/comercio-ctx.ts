import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { ADMIN_COMERCIO_COOKIE } from "@/lib/admin-comercio-cookie"

export interface ComercioCtx {
  comercioId: string
  ownerId: string
  isAdmin: boolean
  features: unknown
}

const ctxSelect = {
  id: true,
  ownerId: true,
  plan: { select: { features: true } },
} as const

// Resolve o comércio-alvo das rotas /api/comerciante/*:
// - COMERCIANTE → o próprio comércio (ownerId da sessão).
// - ADMIN/SUPER_ADMIN → o comércio do cookie admin_comercio_id, permitindo que o
//   admin gerencie qualquer comércio pelo mesmo painel e pelas mesmas rotas.
//   O cookie só é honrado para admins — forjado por outro role, é ignorado.
export async function getComercioCtx(): Promise<ComercioCtx | null> {
  const session = await auth()
  if (!session) return null
  const role = session.user.role

  if (role === "COMERCIANTE") {
    const comercio = await prisma.comercio.findUnique({
      where: { ownerId: session.user.id },
      select: ctxSelect,
    })
    if (!comercio) return null
    return {
      comercioId: comercio.id,
      ownerId: comercio.ownerId,
      isAdmin: false,
      features: comercio.plan.features,
    }
  }

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    const comercioId = (await cookies()).get(ADMIN_COMERCIO_COOKIE)?.value
    if (!comercioId) return null
    const comercio = await prisma.comercio.findUnique({
      where: { id: comercioId },
      select: ctxSelect,
    })
    if (!comercio) return null
    return {
      comercioId: comercio.id,
      ownerId: comercio.ownerId,
      isAdmin: true,
      features: comercio.plan.features,
    }
  }

  return null
}
