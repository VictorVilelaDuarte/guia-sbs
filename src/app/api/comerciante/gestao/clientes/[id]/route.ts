import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { atualizarCliente, excluirCliente, registrarAcessoAdmin } from "@/lib/gestao/clientes-dados"
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
    const atualizado = await atualizarCliente(g.ctx.comercioId, id, parsed.data)
    await registrarAcessoAdmin(g.ctx, "EDICAO", id)
    return NextResponse.json(atualizado)
  } catch (e) {
    return respostaErroCliente(e)
  }
}

// Exclusão a pedido do titular: apaga o cliente e anonimiza os pedidos dele
// (ver excluirCliente). Bloqueada com pedido em andamento (409).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardClientes()
  if ("erro" in g) return g.erro
  const { id } = await params

  try {
    const resultado = await excluirCliente(g.ctx.comercioId, id)
    await registrarAcessoAdmin(g.ctx, "EXCLUSAO", id)
    return NextResponse.json(resultado)
  } catch (e) {
    return respostaErroCliente(e)
  }
}
