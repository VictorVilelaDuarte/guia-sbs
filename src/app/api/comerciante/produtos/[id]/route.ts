import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
  variacoes: z.array(variacaoSchema).optional(),
})

async function ownerCheck(produtoId: string) {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null

  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
    include: {
      comercio: { select: { ownerId: true } },
      variacoes: { orderBy: { ordem: "asc" } },
    },
  })

  if (!produto || produto.comercio.ownerId !== session.user.id) return null
  return produto
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const produto = await ownerCheck(id)
  if (!produto) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

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
  const produto = await ownerCheck(id)
  if (!produto) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

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
