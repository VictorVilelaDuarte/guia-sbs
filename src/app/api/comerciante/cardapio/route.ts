import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getComerciante() {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null
  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  return comercio ? { userId: session.user.id, comercioId: comercio.id } : null
}

export async function GET() {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const categorias = await prisma.cardapioCategoria.findMany({
    where: { comercioId: ctx.comercioId },
    orderBy: { ordem: "asc" },
    include: {
      produtos: {
        orderBy: { ordem: "asc" },
        include: { variacoes: { orderBy: { ordem: "asc" } } },
      },
    },
  })

  return NextResponse.json(categorias)
}
