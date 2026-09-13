import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao, pode } from "@/lib/comercio-ctx"
import type { Permissao } from "@/lib/gestao/permissoes"
import { z } from "zod"
import { deleteFile } from "@/lib/supabase-storage"

const variacaoSchema = z.object({
  nome: z.string().min(1).max(80),
  preco: z.number().nonnegative(),
})

const patchSchema = z.object({
  tipo: z.enum(["PRODUTO", "SERVICO"]).optional(),
  titulo: z.string().min(1).max(120).optional(),
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

// Cardápio e catálogo compartilham o model Produto: a permissão de edição
// depende de onde o item está — e, num PATCH que o move, de para onde vai.
function permissaoDeEdicao(categoriaCardapioId: string | null): Permissao {
  return categoriaCardapioId ? "cardapio:editar" : "catalogo:editar"
}

async function ownerCheck(produtoId: string) {
  const ctx = await getComercioCtx()
  if (!ctx) return null

  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
    include: {
      variacoes: { orderBy: { ordem: "asc" } },
    },
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
  const { produto, ctx } = check

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  // Só ligar/desligar a disponibilidade (botão Visível/Oculto) é liberado para
  // quem tem itens:disponibilidade (ex.: atendente). Qualquer outro campo exige
  // editar o cardápio/catálogo — na origem e no destino, se o item mudar de lugar.
  const soDisponibilidade =
    Object.keys(parsed.data).length === 1 && parsed.data.disponivel !== undefined
  if (!(soDisponibilidade && pode(ctx, "itens:disponibilidade"))) {
    const origem = permissaoDeEdicao(produto.categoriaCardapioId)
    const destino =
      parsed.data.categoriaCardapioId !== undefined
        ? permissaoDeEdicao(parsed.data.categoriaCardapioId)
        : origem
    const negado = negarSemPermissao(ctx, origem) ?? negarSemPermissao(ctx, destino)
    if (negado) return negado
  }

  if (parsed.data.categoriaCardapioId) {
    const categoria = await prisma.cardapioCategoria.findUnique({
      where: { id: parsed.data.categoriaCardapioId },
      select: { comercioId: true },
    })
    if (!categoria || categoria.comercioId !== produto.comercioId) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }
  }

  if (parsed.data.categoriaCatalogoId) {
    const tipoAlvo = parsed.data.tipo ?? produto.tipo
    const categoria = await prisma.catalogoCategoria.findUnique({
      where: { id: parsed.data.categoriaCatalogoId },
      select: { comercioId: true, tipo: true },
    })
    if (!categoria || categoria.comercioId !== produto.comercioId || categoria.tipo !== tipoAlvo) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }
  }

  const { variacoes, ...produtoData } = parsed.data

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
        include: {
          variacoes: { orderBy: { ordem: "asc" } },
          categoriaCardapio: { select: { id: true, nome: true } },
          categoriaCatalogo: { select: { id: true, nome: true } },
        },
      })
    })
  } else {
    updated = await prisma.produto.update({
      where: { id },
      data: produtoData,
      include: {
        variacoes: { orderBy: { ordem: "asc" } },
        categoriaCardapio: { select: { id: true, nome: true } },
        categoriaCatalogo: { select: { id: true, nome: true } },
      },
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
  const negado = negarSemPermissao(ctx, permissaoDeEdicao(produto.categoriaCardapioId))
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
