import type { Viewport } from "next"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { temFeature } from "@/lib/plan-features"
import { parseHorarios, getDiaAtual, estaAbertoAgora } from "@/lib/horarios"
import { CheckoutForm } from "@/components/public/cardapio/checkout-form"

export const viewport: Viewport = {
  userScalable: false,
}

export const metadata = {
  title: "Finalizar pedido",
  robots: { index: false, follow: false },
}

export default async function PaginaCheckout({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const comercio = await prisma.comercio.findUnique({
    where: { slug },
    select: {
      id: true,
      nome: true,
      status: true,
      horarios: true,
      plan: { select: { features: true } },
      pedidoConfig: true,
      zonasEntrega: {
        where: { ativo: true },
        orderBy: [{ cidade: "asc" }, { ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true, cidade: true, uf: true, taxa: true },
      },
    },
  })

  if (!comercio) notFound()

  const cfg = comercio.pedidoConfig
  const podePedir =
    comercio.status === "ATIVO" &&
    temFeature(comercio.plan.features, "pedido_online") &&
    !!cfg?.aceitaPedidos

  // Sem pedido ativo, não há checkout — volta ao cardápio.
  if (!podePedir || !cfg) redirect(`/vitrine/${slug}/cardapio`)

  // Aberto agora? Sem horário cadastrado, considera aberto (igual ao servidor).
  const horarios = parseHorarios(comercio.horarios)
  let abertoAgora = true
  if (horarios) {
    const hoje = horarios.find((h) => h.dia === getDiaAtual())
    if (hoje) abertoAgora = estaAbertoAgora(hoje, horarios).aberto
  }

  return (
    <CheckoutForm
      slug={slug}
      comercioId={comercio.id}
      nomeComercio={comercio.nome}
      abertoAgora={abertoAgora}
      zonas={comercio.zonasEntrega}
      config={{
        entregaAtiva: cfg.entregaAtiva,
        retiradaAtiva: cfg.retiradaAtiva,
        pedidoMinimo: cfg.pedidoMinimo,
        formasPagamento: cfg.formasPagamento,
        tempoPreparoMin: cfg.tempoPreparoMin,
      }}
    />
  )
}
