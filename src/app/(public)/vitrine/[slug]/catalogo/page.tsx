import type { Viewport } from "next"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { temFeature } from "@/lib/plan-features"
import { CatalogoView } from "@/components/public/catalogo-view"
import { VitrineTracker } from "@/components/public/analytics/vitrine-tracker"

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
      id: true,
      status: true,
      nome: true,
      logo: true,
      slug: true,
      whatsapp: true,
      telefone: true,
      plan: { select: { features: true } },
      pedidoConfig: { select: { aceitaPedidos: true } },
      produtos: {
        where: { disponivel: true, arquivado: false, noCatalogo: true },
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
        include: {
          variacoes: { orderBy: { ordem: "asc" } },
          // Produto do catálogo também pode ser pedido online — com os mesmos
          // complementos que teria no cardápio (validados no /api/pedidos).
          complementos: {
            orderBy: { ordem: "asc" },
            where: { grupo: { ativo: true } },
            select: {
              grupo: {
                select: {
                  id: true, nome: true, minimo: true, maximo: true,
                  opcoes: { where: { disponivel: true }, orderBy: { ordem: "asc" }, select: { id: true, nome: true, preco: true, quantidadeMax: true } },
                },
              },
            },
          },
        },
      },
      catalogoCategorias: { orderBy: [{ tipo: "asc" }, { ordem: "asc" }] },
    },
  })

  if (!comercio) notFound()
  if (!temFeature(comercio.plan.features, "catalogo")) notFound()

  // Campo a campo: custo e código interno nunca vão para a tela pública.
  const paraItem = (p: (typeof comercio.produtos)[number]) => ({
    id: p.id,
    tipo: p.tipo as "PRODUTO" | "SERVICO",
    titulo: p.titulo,
    descricao: p.descricao,
    preco: p.preco,
    precoPromo: p.precoPromo,
    promoFim: p.promoFim ? p.promoFim.toISOString() : null,
    destaque: p.destaque,
    imagens: p.imagens,
    categoriaCatalogoId: p.categoriaCatalogoId,
    variacoes: p.variacoes.map((v) => ({ id: v.id, nome: v.nome, preco: v.preco })),
    complementos: p.complementos.map((c) => c.grupo).filter((g) => g.opcoes.length > 0),
    unidade: p.unidade,
  })
  // Pedido online: mesma regra do cardápio (plano + loja aceitando + ATIVO).
  const pedidoAtivo =
    comercio.status === "ATIVO" &&
    temFeature(comercio.plan.features, "pedido_online") &&
    !!comercio.pedidoConfig?.aceitaPedidos

  const produtos = comercio.produtos.filter((p) => p.tipo === "PRODUTO")
  const servicos = comercio.produtos.filter((p) => p.tipo === "SERVICO")

  if (produtos.length === 0 && servicos.length === 0) notFound()

  const categoriasProdutos = comercio.catalogoCategorias
    .filter((c) => c.tipo === "PRODUTO")
    .map((c) => ({ id: c.id, nome: c.nome }))
  const categoriasServicos = comercio.catalogoCategorias
    .filter((c) => c.tipo === "SERVICO")
    .map((c) => ({ id: c.id, nome: c.nome }))

  return (
    <>
      {comercio.status === "ATIVO" && (
        <VitrineTracker comercioId={comercio.id} pageTipo="catalogo_view" />
      )}
    <CatalogoView
      nome={comercio.nome}
      logo={comercio.logo}
      slug={comercio.slug}
      whatsapp={comercio.whatsapp}
      telefone={comercio.telefone}
      produtos={produtos.map(paraItem)}
      categoriasProdutos={categoriasProdutos}
      categoriasServicos={categoriasServicos}
      servicos={servicos.map(paraItem)}
      now={Date.now()}
      pedidoAtivo={pedidoAtivo}
    />
    </>
  )
}
