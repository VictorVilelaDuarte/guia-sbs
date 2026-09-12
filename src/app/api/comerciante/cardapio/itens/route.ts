import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { z } from "zod"

const variacaoSchema = z.object({
  nome: z.string().min(1).max(80),
  preco: z.number().nonnegative(),
})

// categoriaId no payload é mapeado para categoriaCardapioId no Produto
const createSchema = z.object({
  titulo: z.string().min(1).max(120),
  descricao: z.string().max(1000).optional().nullable(),
  preco: z.number().positive().optional().nullable(),
  imagens: z.array(z.string().url()).max(3).optional(),
  disponivel: z.boolean().optional(),
  categoriaId: z.string(),
  variacoes: z.array(variacaoSchema).optional(),
})

export async function POST(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })

  const categoria = await prisma.cardapioCategoria.findUnique({
    where: { id: parsed.data.categoriaId },
    select: { comercioId: true },
  })
  if (!categoria || categoria.comercioId !== ctx.comercioId) {
    return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
  }

  const { variacoes, categoriaId, ...itemData } = parsed.data
  const count = await prisma.produto.count({
    where: { comercioId: ctx.comercioId, categoriaCardapioId: categoriaId },
  })

  const produto = await prisma.produto.create({
    data: {
      ...itemData,
      imagens: itemData.imagens ?? [],
      comercioId: ctx.comercioId,
      categoriaCardapioId: categoriaId,
      ordem: count,
      variacoes: variacoes?.length
        ? { create: variacoes.map((v, i) => ({ ...v, ordem: i })) }
        : undefined,
    },
    include: { variacoes: { orderBy: { ordem: "asc" } } },
  })

  return NextResponse.json(produto, { status: 201 })
}
