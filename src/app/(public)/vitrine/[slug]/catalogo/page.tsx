import type { Viewport } from "next"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { temFeature } from "@/lib/plan-features"
import { CatalogoView } from "@/components/public/catalogo-view"

export const viewport: Viewport = {
  userScalable: false,
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const comercio = await prisma.comercio.findUnique({
    where: { slug },
    select: { nome: true },
  })
  if (!comercio) return {}
  return { title: `Catálogo — ${comercio.nome}` }
}

export default async function PaginaCatalogo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const comercio = await prisma.comercio.findUnique({
    where: { slug },
    select: {
      nome: true,
      logo: true,
      slug: true,
      whatsapp: true,
      telefone: true,
      plan: { select: { features: true } },
      produtos: {
        where: { disponivel: true, categoriaCardapioId: null },
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
        include: { variacoes: { orderBy: { ordem: "asc" } } },
      },
    },
  })

  if (!comercio) notFound()
  if (!temFeature(comercio.plan.features, "catalogo")) notFound()

  const produtos = comercio.produtos.filter((p) => p.tipo === "PRODUTO")
  const servicos = comercio.produtos.filter((p) => p.tipo === "SERVICO")

  if (produtos.length === 0 && servicos.length === 0) notFound()

  return (
    <CatalogoView
      nome={comercio.nome}
      logo={comercio.logo}
      slug={comercio.slug}
      whatsapp={comercio.whatsapp}
      telefone={comercio.telefone}
      produtos={produtos.map((p) => ({
        id: p.id,
        tipo: p.tipo as "PRODUTO" | "SERVICO",
        titulo: p.titulo,
        descricao: p.descricao,
        preco: p.preco,
        precoPromo: p.precoPromo,
        promoFim: p.promoFim ? p.promoFim.toISOString() : null,
        destaque: p.destaque,
        imagens: p.imagens,
        variacoes: p.variacoes.map((v) => ({ id: v.id, nome: v.nome, preco: v.preco })),
      }))}
      servicos={servicos.map((p) => ({
        id: p.id,
        tipo: p.tipo as "PRODUTO" | "SERVICO",
        titulo: p.titulo,
        descricao: p.descricao,
        preco: p.preco,
        precoPromo: p.precoPromo,
        promoFim: p.promoFim ? p.promoFim.toISOString() : null,
        destaque: p.destaque,
        imagens: p.imagens,
        variacoes: p.variacoes.map((v) => ({ id: v.id, nome: v.nome, preco: v.preco })),
      }))}
      now={Date.now()}
    />
  )
}
