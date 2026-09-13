import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx, negarSemPermissao } from "@/lib/comercio-ctx"
import type { Permissao } from "@/lib/gestao/permissoes"
import { z } from "zod"
import { COMODIDADE_KEYS } from "@/lib/hospedagem"
import { deleteFile } from "@/lib/supabase-storage"

const MAX_FOTOS = 8

const patchSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  descricao: z.string().max(2000).optional().nullable(),
  precoNoite: z.number().positive().optional().nullable(),
  capacidade: z.number().int().positive().max(99).optional().nullable(),
  camas: z.string().max(120).optional().nullable(),
  tamanhoM2: z.number().positive().max(9999).optional().nullable(),
  comodidades: z.array(z.enum(COMODIDADE_KEYS as [string, ...string[]])).optional(),
  fotos: z.array(z.string().url()).max(MAX_FOTOS).optional(),
  ativo: z.boolean().optional(),
})

async function ownerCheck(quartoId: string, ...permissoes: Permissao[]) {
  const ctx = await getComercioCtx()
  if (!ctx) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  const negado = negarSemPermissao(ctx, ...permissoes)
  if (negado) return { erro: negado }
  const quarto = await prisma.tipoQuarto.findUnique({
    where: { id: quartoId },
  })
  if (!quarto || quarto.comercioId !== ctx.comercioId) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  return { item: quarto, ctx }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await ownerCheck(id, "quartos:editar")
  if ("erro" in check) return check.erro

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })
  }

  const updated = await prisma.tipoQuarto.update({ where: { id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await ownerCheck(id, "quartos:editar")
  if ("erro" in check) return check.erro
  const quarto = check.item

  // Remove as fotos do storage (best-effort, como nas demais rotas).
  for (const url of quarto.fotos) {
    try {
      const path = new URL(url).pathname.split("/object/public/comercios/")[1]
      if (path) await deleteFile(path)
    } catch {}
  }

  await prisma.tipoQuarto.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
