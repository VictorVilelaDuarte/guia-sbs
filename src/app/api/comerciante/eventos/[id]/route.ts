import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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

async function ownerCheck(eventoId: string) {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    include: { comercio: { select: { ownerId: true } } },
  })

  if (!evento || evento.comercio.ownerId !== session.user.id) return null
  return evento
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const evento = await ownerCheck(id)
  if (!evento) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

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
  const evento = await ownerCheck(id)
  if (!evento) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

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
