import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import type { Permissao } from "@/lib/gestao/permissoes"
import { z } from "zod"

const patchSchema = z.object({
  nome: z.string().min(1).max(80).optional(),
})

async function ownerCheck(categoriaId: string, ...permissoes: Permissao[]) {
  const ctx = await getComercioCtx()
  if (!ctx) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  const negado = negarSemPermissao(ctx, ...permissoes)
  if (negado) return { erro: negado }

  const categoria = await prisma.catalogoCategoria.findUnique({
    where: { id: categoriaId },
  })

  if (!categoria || categoria.comercioId !== ctx.comercioId) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  return { item: categoria, ctx }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const check = await ownerCheck(id, "catalogo:editar")
  if ("erro" in check) return check.erro

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })

  const updated = await prisma.catalogoCategoria.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const check = await ownerCheck(id, "catalogo:editar")
  if ("erro" in check) return check.erro

  // Categoria é opcional: excluir não apaga os itens. O onDelete: SetNull no
  // Produto desvincula os itens, que voltam para o bloco "Outros".
  await prisma.catalogoCategoria.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
