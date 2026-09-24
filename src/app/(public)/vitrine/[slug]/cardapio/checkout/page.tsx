import type { Viewport } from "next"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { temFeature } from "@/lib/plan-features"
import { parseHorarios, getDiaAtual, estaAbertoAgora } from "@/lib/horarios"
import { CheckoutForm } from "@/components/public/cardapio/checkout-form"
import { paraNumero } from "@/lib/dinheiro"

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
      // Loja só com catálogo (sem cardápio): "voltar" e "adicionar mais" vão ao catálogo.
      _count: { select: { produtos: { where: { categoriaCardapioId: { not: null }, disponivel: true, arquivado: false } } } },
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

  const temCardapio = temFeature(comercio.plan.features, "cardapio") && comercio._count.produtos > 0
  const voltarHref = `/vitrine/${slug}/${temCardapio ? "cardapio" : "catalogo"}`

  // Sem pedido ativo, não há checkout — volta ao cardápio (ou ao catálogo).
  if (!podePedir || !cfg) redirect(voltarHref)

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
      voltarHref={voltarHref}
      comercioId={comercio.id}
      nomeComercio={comercio.nome}
      abertoAgora={abertoAgora}
      zonas={comercio.zonasEntrega.map((z) => ({ ...z, taxa: paraNumero(z.taxa) }))}
      config={{
        entregaAtiva: cfg.entregaAtiva,
        retiradaAtiva: cfg.retiradaAtiva,
        pedidoMinimo: paraNumero(cfg.pedidoMinimo),
        formasPagamento: cfg.formasPagamento,
        tempoPreparoMin: cfg.tempoPreparoMin,
      }}
    />
  )
}
