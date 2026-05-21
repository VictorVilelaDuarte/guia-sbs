import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("categoria"), ids: z.array(z.string()) }),
  z.object({ tipo: z.literal("item"), categoriaId: z.string(), ids: z.array(z.string()) }),
])

async function getComerciante() {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null
  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  return comercio ? { comercioId: comercio.id } : null
}

export async function PATCH(req: NextRequest) {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  if (parsed.data.tipo === "categoria") {
    await prisma.$transaction(
      parsed.data.ids.map((id, ordem) =>
        prisma.cardapioCategoria.updateMany({
          where: { id, comercioId: ctx.comercioId },
          data: { ordem },
        })
      )
    )
  } else {
    const { categoriaId, ids } = parsed.data

    const categoria = await prisma.cardapioCategoria.findUnique({
      where: { id: categoriaId },
      select: { comercioId: true },
    })
    if (!categoria || categoria.comercioId !== ctx.comercioId) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }

    await prisma.$transaction(
      ids.map((id, ordem) =>
        prisma.cardapioItem.updateMany({
          where: { id, categoriaId },
          data: { ordem },
        })
      )
    )
  }

  return NextResponse.json({ ok: true })
}
