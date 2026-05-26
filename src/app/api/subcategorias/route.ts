import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Rota pública — retorna subcategorias ativas agrupadas por categoria
export async function GET() {
  const subcategorias = await prisma.subcategoria.findMany({
    where: { ativo: true },
    orderBy: [{ categoria: "asc" }, { ordem: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true, categoria: true },
  })

  return NextResponse.json(subcategorias)
}
