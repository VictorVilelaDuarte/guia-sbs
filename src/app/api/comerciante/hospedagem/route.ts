import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getComercioCtx } from "@/lib/comercio-ctx"
import { z } from "zod"
import { COMODIDADE_KEYS, FORMA_PAGAMENTO_KEYS } from "@/lib/hospedagem"

// HH:MM ou vazio
const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida")
  .optional()
  .nullable()

const perfilSchema = z.object({
  comodidades: z.array(z.enum(COMODIDADE_KEYS as [string, ...string[]])).optional(),
  checkIn: horaSchema,
  checkOut: horaSchema,
  politicaCancelamento: z.string().max(2000).optional().nullable(),
  aceitaPets: z.boolean().optional(),
  aceitaCriancas: z.boolean().optional(),
  formasPagamento: z.array(z.enum(FORMA_PAGAMENTO_KEYS as [string, ...string[]])).optional(),
  observacoes: z.string().max(2000).optional().nullable(),
})

export async function PUT(req: NextRequest) {
  const ctx = await getComercioCtx()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await req.json()
  const parsed = perfilSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })
  }

  const data = {
    comodidades: parsed.data.comodidades ?? [],
    checkIn: parsed.data.checkIn ?? null,
    checkOut: parsed.data.checkOut ?? null,
    politicaCancelamento: parsed.data.politicaCancelamento ?? null,
    aceitaPets: parsed.data.aceitaPets ?? false,
    aceitaCriancas: parsed.data.aceitaCriancas ?? true,
    formasPagamento: parsed.data.formasPagamento ?? [],
    observacoes: parsed.data.observacoes ?? null,
  }

  const perfil = await prisma.hospedagemPerfil.upsert({
    where: { comercioId: ctx.comercioId },
    create: { comercioId: ctx.comercioId, ...data },
    update: data,
  })

  return NextResponse.json(perfil)
}
