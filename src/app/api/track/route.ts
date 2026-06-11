import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { TIPOS_EVENTO, ORIGENS } from "@/lib/analytics/types"

const eventoSchema = z.object({
  comercioId: z.string().cuid(),
  tipo: z.enum(TIPOS_EVENTO),
  origem: z.enum(ORIGENS).optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  visitorId: z.string().uuid().optional(),
})

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|lighthouse|headless/i

// Rota pública de coleta de analytics — recebe sendBeacon das páginas da
// vitrine. Sempre responde 204 (sucesso silencioso): telemetria nunca deve
// quebrar nem revelar nada ao cliente. Dados anônimos, sem PII (LGPD).
export async function POST(request: Request) {
  try {
    const ua = request.headers.get("user-agent") ?? ""
    if (BOT_RE.test(ua)) return new NextResponse(null, { status: 204 })

    // sendBeacon envia como text/plain — ler como texto e parsear na mão
    const body = eventoSchema.parse(JSON.parse(await request.text()))

    await prisma.analyticsEvent.create({
      data: {
        comercioId: body.comercioId,
        tipo: body.tipo,
        origem: body.origem,
        meta: body.meta,
        visitorId: body.visitorId,
      },
    })
  } catch {
    // payload inválido, comercioId inexistente (FK) ou DB fora — ignorar
  }
  return new NextResponse(null, { status: 204 })
}
