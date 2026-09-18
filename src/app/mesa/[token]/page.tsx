import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cardapioDaMesa, contaDaMesa } from "@/lib/gestao/mesas"
import { MesaCliente } from "./mesa-cliente"

// Página PÚBLICA do QR da mesa (docs/gestao-ideias.md 5.2). Fora do route group
// (public): é uma tela de uso na mesa, sem rodapé nem barra de navegação do guia.
// Nunca indexar — o link é o segredo do QR.
export const metadata: Metadata = { title: "Sua mesa", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default async function MesaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [conta, cardapio] = await Promise.all([contaDaMesa(token), cardapioDaMesa(token)])
  if (!conta) notFound()
  return <MesaCliente inicial={conta} cardapio={conta.permite.pedido ? cardapio : null} token={token} />
}
