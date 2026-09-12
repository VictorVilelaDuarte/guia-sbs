import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { z } from "zod"

const variacaoSchema = z.object({
  nome: z.string().min(1).max(80),
  preco: z.number().nonnegative(),
})

const createSchema = z.object({
  tipo: z.enum(["PRODUTO", "SERVICO"]).optional(),
  titulo: z.string().min(1).max(120),
  descricao: z.string().max(1000).optional().nullable(),
  preco: z.number().positive().optional().nullable(),
  imagens: z.array(z.string().url()).max(3).optional(),
  disponivel: z.boolean().optional(),
  destaque: z.boolean().optional(),
  precoPromo: z.number().positive().optional().nullable(),
  promoFim: z.string().datetime({ offset: true }).optional().nullable(),
  categoriaCardapioId: z.string().optional().nullable(),
  categoriaCatalogoId: z.string().optional().nullable(),
  variacoes: z.array(variacaoSchema).optional(),
})

export async function GET() {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const produtos = await prisma.produto.findMany({
    where: { comercioId: ctx.comercioId },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    include: {
      variacoes: { orderBy: { ordem: "asc" } },
      categoriaCardapio: { select: { id: true, nome: true } },
      categoriaCatalogo: { select: { id: true, nome: true } },
    },
  })

  return NextResponse.json(produtos)
}

export async function POST(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })

  if (parsed.data.categoriaCardapioId) {
    const categoria = await prisma.cardapioCategoria.findUnique({
      where: { id: parsed.data.categoriaCardapioId },
      select: { comercioId: true },
    })
    if (!categoria || categoria.comercioId !== ctx.comercioId) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }
  }

  if (parsed.data.categoriaCatalogoId) {
    const categoria = await prisma.catalogoCategoria.findUnique({
      where: { id: parsed.data.categoriaCatalogoId },
      select: { comercioId: true, tipo: true },
    })
    // A categoria do catálogo precisa ser do mesmo comércio e do mesmo tipo
    // do item (categorias de produto não servem para serviços e vice-versa).
    if (!categoria || categoria.comercioId !== ctx.comercioId || categoria.tipo !== (parsed.data.tipo ?? "PRODUTO")) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }
  }

  const { variacoes, ...produtoData } = parsed.data
  const count = await prisma.produto.count({ where: { comercioId: ctx.comercioId } })

  const produto = await prisma.produto.create({
    data: {
      ...produtoData,
      imagens: produtoData.imagens ?? [],
      comercioId: ctx.comercioId,
      ordem: count,
      variacoes: variacoes?.length
        ? { create: variacoes.map((v, i) => ({ ...v, ordem: i })) }
        : undefined,
    },
    include: {
      variacoes: { orderBy: { ordem: "asc" } },
      categoriaCardapio: { select: { id: true, nome: true } },
      categoriaCatalogo: { select: { id: true, nome: true } },
    },
  })

  return NextResponse.json(produto, { status: 201 })
}
