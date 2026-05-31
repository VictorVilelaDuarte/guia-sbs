import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  descricao: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  dicas: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
  // trilha
  dificuldade: z.enum(["FACIL", "MODERADA", "DIFICIL"]).nullable().optional(),
  distanciaKm: z.number().nullable().optional(),
  duracaoMin: z.number().int().nullable().optional(),
  // mirante
  altitudeM: z.number().int().nullable().optional(),
  // cachoeira
  temPiscinaNatural: z.boolean().nullable().optional(),
  precisaGuia: z.boolean().nullable().optional(),
  // historico
  periodo: z.string().nullable().optional(),
})

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const ponto = await prisma.pontoTuristico.update({
      where: { id },
      data: parsed.data,
    })
    return NextResponse.json(ponto)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[PATCH /pontos-turisticos]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  await prisma.pontoTuristico.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
