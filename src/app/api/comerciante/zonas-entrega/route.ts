import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Zonas de entrega da loja (bairro + taxa). PUT substitui o conjunto inteiro.
// Anti-tamper: zonas vinculadas ao catálogo (`bairroId`) têm nome/cidade/uf
// recarregados do Bairro — o cliente não dita esses campos. Áreas custom
// (`bairroId` null) usam o que a loja digitou. Ver docs/pedido-online.md.

const zonaSchema = z.object({
  bairroId: z.string().nullable().optional(),
  nome: z.string().min(1).max(120),
  cidade: z.string().min(1).max(80),
  uf: z.string().length(2),
  taxa: z.number().nonnegative().max(9999),
})

const putSchema = z.object({ zonas: z.array(zonaSchema).max(300) })

async function getComerciante() {
  const session = await auth()
  if (!session || session.user.role !== "COMERCIANTE") return null
  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  return comercio ? { comercioId: comercio.id } : null
}

export async function GET() {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const zonas = await prisma.zonaEntrega.findMany({
    where: { comercioId: ctx.comercioId },
    orderBy: [{ cidade: "asc" }, { ordem: "asc" }, { nome: "asc" }],
  })
  return NextResponse.json(zonas)
}

export async function PUT(req: NextRequest) {
  const ctx = await getComerciante()
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const parsed = putSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })
  }

  // Carrega os bairros do catálogo referenciados, para reescrever nome/cidade/uf
  // a partir da fonte canônica (anti-tamper).
  const ids = [...new Set(parsed.data.zonas.map((z) => z.bairroId).filter((v): v is string => !!v))]
  const bairros = ids.length
    ? await prisma.bairro.findMany({ where: { id: { in: ids }, ativo: true } })
    : []
  const mapBairro = new Map(bairros.map((b) => [b.id, b]))

  const data = parsed.data.zonas.map((z, i) => {
    if (z.bairroId) {
      const b = mapBairro.get(z.bairroId)
      if (!b) return null // bairro inválido/inativo — descarta a entrada
      return {
        comercioId: ctx.comercioId,
        bairroId: b.id,
        nome: b.nome,
        cidade: b.cidade,
        uf: b.uf,
        taxa: z.taxa,
        ordem: i,
      }
    }
    return {
      comercioId: ctx.comercioId,
      bairroId: null,
      nome: z.nome.trim(),
      cidade: z.cidade.trim(),
      uf: z.uf.toUpperCase(),
      taxa: z.taxa,
      ordem: i,
    }
  }).filter((v): v is NonNullable<typeof v> => v !== null)

  await prisma.$transaction([
    prisma.zonaEntrega.deleteMany({ where: { comercioId: ctx.comercioId } }),
    prisma.zonaEntrega.createMany({ data }),
  ])

  return NextResponse.json({ ok: true, total: data.length })
}
