import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao, pode } from "@/lib/comercio-ctx"
import { z } from "zod"
import { deleteFile } from "@/lib/supabase-storage"

const variacaoSchema = z.object({
  nome: z.string().min(1).max(80),
  preco: z.number().nonnegative(),
})

const patchSchema = z.object({
  titulo: z.string().min(1).max(120).optional(),
  descricao: z.string().max(1000).optional().nullable(),
  preco: z.number().positive().optional().nullable(),
  imagens: z.array(z.string().url()).max(3).optional(),
  disponivel: z.boolean().optional(),
  categoriaId: z.string().optional(),
  variacoes: z.array(variacaoSchema).optional(),
})

async function ownerCheck(produtoId: string) {
  const ctx = await getComercioCtx()
  if (!ctx) return null

  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
  })

  if (!produto || produto.comercioId !== ctx.comercioId) return null
  return { produto, ctx }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const check = await ownerCheck(id)
  if (!check) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const { ctx } = check

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  // Mesma regra de /produtos/[id]: só a disponibilidade é liberada para itens:disponibilidade.
  const soDisponibilidade =
    Object.keys(parsed.data).length === 1 && parsed.data.disponivel !== undefined
  if (!(soDisponibilidade && pode(ctx, "itens:disponibilidade"))) {
    const negado = negarSemPermissao(ctx, "cardapio:editar")
    if (negado) return negado
  }
  if (parsed.data.categoriaId) {
    const categoria = await prisma.cardapioCategoria.findUnique({
      where: { id: parsed.data.categoriaId },
      select: { comercioId: true },
    })
    if (!categoria || categoria.comercioId !== ctx.comercioId) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }
  }

  const { variacoes, categoriaId, ...itemData } = parsed.data
  const produtoData = {
    ...itemData,
    ...(categoriaId !== undefined ? { categoriaCardapioId: categoriaId } : {}),
  }

  let updated
  if (variacoes !== undefined) {
    updated = await prisma.$transaction(async (tx) => {
      await tx.cardapioVariacao.deleteMany({ where: { produtoId: id } })
      if (variacoes.length > 0) {
        await tx.cardapioVariacao.createMany({
          data: variacoes.map((v, i) => ({ ...v, produtoId: id, ordem: i })),
        })
      }
      return tx.produto.update({
        where: { id },
        data: produtoData,
        include: { variacoes: { orderBy: { ordem: "asc" } } },
      })
    })
  } else {
    updated = await prisma.produto.update({
      where: { id },
      data: produtoData,
      include: { variacoes: { orderBy: { ordem: "asc" } } },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const check = await ownerCheck(id)
  if (!check) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  const { produto, ctx } = check
  const negado = negarSemPermissao(ctx, "cardapio:editar")
  if (negado) return negado

  for (const url of produto.imagens) {
    try {
      const parsed = new URL(url)
      const path = parsed.pathname.split("/object/public/comercios/")[1]
      if (path) await deleteFile(path)
    } catch {}
  }

  await prisma.produto.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
