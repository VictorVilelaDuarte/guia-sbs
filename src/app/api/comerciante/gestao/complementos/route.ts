import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { criarGrupo, listarGrupos, MAX_OPCOES } from "@/lib/gestao/complementos"
import { guardPdv, responder } from "@/lib/gestao/pdv-api"

// Grupos de complementos do cardápio ("Borda", "Adicionais", "Ponto da carne").
// Quem edita cardápio cuida deles.
export async function GET() {
  const g = await guardPdv("cardapio:editar")
  if ("resposta" in g) return g.resposta
  return responder(() => listarGrupos(g.ctx.comercioId))
}

export const grupoSchema = z.object({
  nome: z.string().max(60),
  minimo: z.number().int().min(0).max(20),
  maximo: z.number().int().min(1).max(20),
  ativo: z.boolean().optional(),
  opcoes: z
    .array(
      z.object({
        nome: z.string().max(60),
        preco: z.number().min(0).max(99999),
        quantidadeMax: z.number().int().min(1).max(20).optional(),
        disponivel: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(MAX_OPCOES),
})

export async function POST(req: NextRequest) {
  const g = await guardPdv("cardapio:editar")
  if ("resposta" in g) return g.resposta
  const parsed = grupoSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  return responder(() => criarGrupo(g.ctx, parsed.data), 201)
}
