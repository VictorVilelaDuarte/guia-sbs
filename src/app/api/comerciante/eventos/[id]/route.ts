import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import { negarSemRecurso } from "@/lib/plan-limites"
import type { Permissao } from "@/lib/gestao/permissoes"
import { z } from "zod"
import { deleteFile } from "@/lib/supabase-storage"

const patchSchema = z.object({
  titulo:      z.string().min(1).max(150).optional(),
  descricao:   z.string().max(2000).optional().nullable(),
  dataInicio:  z.coerce.date().optional(),
  dataFim:     z.coerce.date().optional().nullable(),
  imagem:      z.string().url().optional().nullable(),
  local:       z.string().max(200).optional().nullable(),
  preco:       z.number().min(0).optional().nullable(),
  linkExterno: z.string().url().optional().nullable(),
})

async function ownerCheck(eventoId: string, ...permissoes: Permissao[]) {
  const ctx = await getComercioCtx()
  if (!ctx) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  const negado = negarSemPermissao(ctx, ...permissoes)
  if (negado) return { erro: negado }

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
  })

  if (!evento || evento.comercioId !== ctx.comercioId) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  return { item: evento, ctx }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const check = await ownerCheck(id, "vitrine:editar")
  if ("erro" in check) return check.erro
  // Editar exige o recurso no plano; excluir não (loja rebaixada consegue limpar).
  const semRecurso = negarSemRecurso(check.ctx.features, "eventos", "Eventos")
  if (semRecurso) return semRecurso

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    console.error("[PATCH /api/comerciante/eventos/:id] Validação falhou:", parsed.error.flatten())
    return NextResponse.json(
      { error: "Dados inválidos.", detalhes: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.evento.update({
      where: { id },
      data: parsed.data,
    })
    return NextResponse.json(updated)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[PATCH /api/comerciante/eventos/:id] Erro Prisma:", err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const check = await ownerCheck(id, "vitrine:editar")
  if ("erro" in check) return check.erro
  const evento = check.item

  if (evento.imagem) {
    try {
      const url = new URL(evento.imagem)
      const path = url.pathname.split("/object/public/comercios/")[1]
      if (path) await deleteFile(path)
    } catch (err) {
      console.warn("[DELETE /api/comerciante/eventos/:id] Falha ao deletar imagem:", err)
    }
  }

  await prisma.evento.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
