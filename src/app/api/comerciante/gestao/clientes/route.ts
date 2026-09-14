import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { criarCliente, registrarAcessoAdmin } from "@/lib/gestao/clientes-dados"
import { camposCliente, guardClientes, respostaErroCliente } from "./_comum"

const createSchema = z.object({ nome: z.string().trim().min(2).max(120), ...camposCliente })

// Cadastro manual (ex.: cliente de balcão — WhatsApp opcional). A lista e o
// detalhe são Server Components; aqui só a escrita.
export async function POST(req: NextRequest) {
  const g = await guardClientes()
  if ("erro" in g) return g.erro

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  try {
    const cliente = await criarCliente(g.ctx.comercioId, parsed.data)
    await registrarAcessoAdmin(g.ctx, "CADASTRO", cliente.id)
    return NextResponse.json(cliente, { status: 201 })
  } catch (e) {
    return respostaErroCliente(e)
  }
}
