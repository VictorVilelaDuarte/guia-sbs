import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
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

async function ownerCheck(quartoId: string) {
  const ctx = await getComercioCtx()
  if (!ctx) return null
  const quarto = await prisma.tipoQuarto.findUnique({
    where: { id: quartoId },
    include: { comercio: { select: { ownerId: true } } },
  })
  if (!quarto || quarto.comercio.ownerId !== ctx.ownerId) return null
  return quarto
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quarto = await ownerCheck(id)
  if (!quarto) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

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
  const quarto = await ownerCheck(id)
  if (!quarto) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

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
