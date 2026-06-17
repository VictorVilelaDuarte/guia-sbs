import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { COMODIDADE_KEYS } from "@/lib/hospedagem"
import { temFeature, LIMITES_FREE } from "@/lib/plan-features"

const MAX_FOTOS = 8

const quartoSchema = z.object({
  nome: z.string().min(1).max(120),
  descricao: z.string().max(2000).optional().nullable(),
  precoNoite: z.number().positive().optional().nullable(),
  capacidade: z.number().int().positive().max(99).optional().nullable(),
  camas: z.string().max(120).optional().nullable(),
  tamanhoM2: z.number().positive().max(9999).optional().nullable(),
  comodidades: z.array(z.enum(COMODIDADE_KEYS as [string, ...string[]])).optional(),
  fotos: z.array(z.string().url()).max(MAX_FOTOS).optional(),
  ativo: z.boolean().optional(),
})

async function getComerciante() {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null
  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true, plan: { select: { features: true } } },
  })
  return comercio ? { userId: session.user.id, comercioId: comercio.id, features: comercio.plan.features } : null
}

export async function POST(req: NextRequest) {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = quartoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })
  }

  // Limite de quartos segue o plano: fotos_ilimitadas (premium) → sem limite.
  const ilimitado = temFeature(ctx.features, "fotos_ilimitadas")
  if (!ilimitado) {
    const count = await prisma.tipoQuarto.count({ where: { comercioId: ctx.comercioId } })
    if (count >= LIMITES_FREE.quartos) {
      return NextResponse.json(
        { error: `Limite de ${LIMITES_FREE.quartos} quartos no plano Gratuito.` },
        { status: 403 },
      )
    }
  }

  const count = await prisma.tipoQuarto.count({ where: { comercioId: ctx.comercioId } })
  const quarto = await prisma.tipoQuarto.create({
    data: {
      comercioId: ctx.comercioId,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      precoNoite: parsed.data.precoNoite ?? null,
      capacidade: parsed.data.capacidade ?? null,
      camas: parsed.data.camas ?? null,
      tamanhoM2: parsed.data.tamanhoM2 ?? null,
      comodidades: parsed.data.comodidades ?? [],
      fotos: parsed.data.fotos ?? [],
      ativo: parsed.data.ativo ?? true,
      ordem: count,
    },
  })

  return NextResponse.json(quarto, { status: 201 })
}
