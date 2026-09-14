import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { atualizarCliente } from "@/lib/gestao/clientes-dados"
import { camposCliente, guardClientes, respostaErroCliente } from "../_comum"

const patchSchema = z.object({ nome: z.string().trim().min(2).max(120).optional(), ...camposCliente })

// Editar dados, observações e tags. Editar o WhatsApp não altera os pedidos
// antigos (o pedido guarda o snapshot). Cliente de outra loja = 404.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardClientes()
  if ("erro" in g) return g.erro
  const { id } = await params

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  try {
    return NextResponse.json(await atualizarCliente(g.ctx.comercioId, id, parsed.data))
  } catch (e) {
    return respostaErroCliente(e)
  }
}
