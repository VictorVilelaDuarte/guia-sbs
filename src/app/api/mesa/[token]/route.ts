import { NextResponse } from "next/server"
import { contaDaMesa } from "@/lib/gestao/mesas"

// Rota PÚBLICA (sem auth): conta da mesa lida pelo QR. Só devolve o que o
// cliente sentado na mesa pode ver — ver src/lib/gestao/mesas.ts.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const conta = await contaDaMesa(token)
  if (!conta) return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 })
  return NextResponse.json(conta, { headers: { "cache-control": "no-store" } })
}
