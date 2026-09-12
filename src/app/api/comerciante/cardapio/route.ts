import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"

export async function GET() {
  const ctx = await getComercioCtx()
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
