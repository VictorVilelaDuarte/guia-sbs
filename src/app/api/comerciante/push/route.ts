import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Registro/remoção de inscrições Web Push do comerciante. Cada dispositivo
// (navegador) que ativa as notificações cria uma inscrição. Ver src/lib/push.ts.

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

async function getComerciante() {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null
  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  return comercio ? { comercioId: comercio.id } : null
}

export async function POST(req: NextRequest) {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const parsed = subscribeSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }
  const { endpoint, keys } = parsed.data

  // upsert por endpoint: reativar num aparelho que já tinha inscrição não duplica,
  // e reassocia ao comércio correto caso o dono tenha mudado.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { comercioId: ctx.comercioId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { comercioId: ctx.comercioId, p256dh: keys.p256dh, auth: keys.auth },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const parsed = unsubscribeSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  // Só remove a inscrição se for do próprio comércio.
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, comercioId: ctx.comercioId },
  })

  return NextResponse.json({ ok: true })
}
