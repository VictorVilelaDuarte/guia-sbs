import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  nome: z.string().min(2).optional(),
  descricao: z.string().optional(),
  categoria: z.enum(["RESTAURANTE", "HOSPEDAGEM", "TURISMO", "SERVICO", "COMERCIO", "ENTRETENIMENTO"]).optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  instagram: z.string().optional(),
  horarios: z.string().optional(),
  logo: z.string().url().optional().or(z.literal("")),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
})

async function requireComerciante() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "COMERCIANTE") return null
  return session
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.searchParams.set("q", query)
    url.searchParams.set("format", "json")
    url.searchParams.set("limit", "1")
    url.searchParams.set("countrycodes", "br")

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "GuiaSBS/1.0" },
      cache: "no-store",
    })

    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || !data[0]) return null

    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export async function GET() {
  const session = await requireComerciante()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    include: { fotos: { orderBy: { ordem: "asc" } } },
  })

  if (!comercio) return NextResponse.json({ error: "Nenhum comércio vinculado." }, { status: 404 })

  return NextResponse.json(comercio)
}

export async function PATCH(req: NextRequest) {
  const session = await requireComerciante()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

    const fields = parsed.data

    // Use client-sent coords (map picker) when present; fall back to server geocoding
    let lat = fields.lat
    let lng = fields.lng

    if ((lat === undefined || lng === undefined) && fields.cidade && fields.estado) {
      const query = [fields.endereco, fields.numero, fields.bairro, fields.cidade, fields.estado, "Brasil"]
        .filter(Boolean)
        .join(", ")
      const coords = await geocode(query)
      if (coords) { lat = coords.lat; lng = coords.lng }
    }

    const { lat: _lat, lng: _lng, ...rest } = fields

    await prisma.comercio.update({
      where: { ownerId: session.user.id },
      data: {
        ...rest,
        ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[PATCH /api/comerciante/comercio]", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
