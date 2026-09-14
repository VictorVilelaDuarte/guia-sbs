import { NextResponse } from "next/server"
import { z } from "zod"
import { getComercioCtx, negarSemPermissao, type ComercioCtx } from "@/lib/comercio-ctx"
import { temFeature } from "@/lib/plan-features"
import { ErroCliente } from "@/lib/gestao/clientes-dados"

// Guard das rotas de escrita de clientes: comércio no contexto, permissão
// clientes:editar (dono, gerente; admin passa) e feature gestao_clientes.
export async function guardClientes(): Promise<{ ctx: ComercioCtx } | { erro: NextResponse }> {
  const ctx = await getComercioCtx()
  if (!ctx) return { erro: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) }
  const negado = negarSemPermissao(ctx, "clientes:editar")
  if (negado) return { erro: negado }
  if (!temFeature(ctx.features, "gestao_clientes")) {
    return { erro: NextResponse.json({ error: "O plano deste comércio não inclui clientes." }, { status: 403 }) }
  }
  return { ctx }
}

const dia = z.number().int().min(1).max(31).nullable().optional()
const mes = z.number().int().min(1).max(12).nullable().optional()

export const camposCliente = {
  whatsapp: z.string().max(30).nullable().optional(),
  email: z.union([z.string().trim().email().max(120), z.literal("")]).nullable().optional(),
  aniversarioDia: dia,
  aniversarioMes: mes,
  observacoes: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
}

export function respostaErroCliente(e: unknown): NextResponse {
  if (e instanceof ErroCliente) {
    return NextResponse.json(
      { error: e.message, ...(e.clienteExistenteId ? { clienteExistenteId: e.clienteExistenteId } : {}) },
      { status: e.status },
    )
  }
  throw e
}
