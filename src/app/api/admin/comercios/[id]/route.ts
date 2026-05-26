import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchSchema = z.object({
  // ações rápidas (dropdown)
  status: z.enum(["PENDENTE", "ATIVO", "INATIVO", "REJEITADO"]).optional(),
  planSlug: z.string().optional(),
  // edição completa (página de edição)
  nome: z.string().min(2).optional(),
  descricao: z.string().optional(),
  categoria: z.enum(["ALIMENTACAO", "HOSPEDAGEM", "TURISMO", "SERVICO", "COMERCIO", "ENTRETENIMENTO"]).optional(),
  subcategoriaIds: z.array(z.string()).optional(),
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

async function requireAdmin() {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) return null
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const { status, planSlug, subcategoriaIds, lat: latRaw, lng: lngRaw, ...rest } = parsed.data

  let planId: string | undefined
  if (planSlug) {
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } })
    if (!plan) return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 })
    planId = plan.id
  }

  let lat = latRaw
  let lng = lngRaw
  if ((lat === undefined || lng === undefined) && rest.cidade && rest.estado) {
    const query = [rest.endereco, rest.numero, rest.bairro, rest.cidade, rest.estado, "Brasil"]
      .filter(Boolean).join(", ")
    const coords = await geocode(query)
    if (coords) { lat = coords.lat; lng = coords.lng }
  }

  const comercio = await prisma.comercio.update({
    where: { id },
    data: {
      ...rest,
      ...(status ? { status } : {}),
      ...(planId ? { planId } : {}),
      ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
      ...(subcategoriaIds !== undefined
        ? { subcategorias: { set: subcategoriaIds.map((sid) => ({ id: sid })) } }
        : {}),
    },
  })

  return NextResponse.json({ id: comercio.id })
}
