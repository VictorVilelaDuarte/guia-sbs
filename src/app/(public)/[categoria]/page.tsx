import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { JsonLd } from "@/components/seo/json-ld"
import { breadcrumbJsonLd } from "@/lib/seo/jsonld"
import { CATEGORIA_SLUG, SLUG_CATEGORIA, CATEGORIA_COPY } from "@/lib/seo/categorias"
import { Hero } from "../comercios/_components/hero"
import { ListagemComercios } from "../comercios/_components/listagem"
import { CATEGORIA_IMAGE } from "../comercios/_utils"

// Rotas dedicadas de categoria (/gastronomia, /hospedagem, /turismo,
// /servicos, /lojas, /entretenimento) — Fase 3 do plano de SEO. Mesmo
// conteúdo da listagem filtrada, mas com URL, H1, metadata e intro
// próprios, que é o que o Google aceita rankear (query params não).
// Rotas estáticas existentes têm precedência sobre este segmento dinâmico.
// A página lê searchParams (renderização dinâmica), então dynamicParams
// não barra slugs desconhecidos — o guard notFound() abaixo é obrigatório.
export const dynamicParams = false

export function generateStaticParams() {
  return Object.values(CATEGORIA_SLUG).map((categoria) => ({ categoria }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string }>
}): Promise<Metadata> {
  const { categoria } = await params
  const cat = SLUG_CATEGORIA[categoria]
  if (!cat) notFound()
  const copy = CATEGORIA_COPY[cat]
  return {
    title: `${copy.title} | Guia SBS`,
    description: copy.description,
    alternates: { canonical: `/${categoria}` },
    openGraph: {
      title: copy.title,
      description: copy.description,
      images: [{ url: CATEGORIA_IMAGE[cat] }],
    },
  }
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>
  searchParams: Promise<{ subcategoria?: string; page?: string }>
}) {
  const [{ categoria }, { subcategoria, page }] = await Promise.all([params, searchParams])
  const cat = SLUG_CATEGORIA[categoria]
  if (!cat) notFound()
  const copy = CATEGORIA_COPY[cat]

  return (
    <div style={{ background: "var(--sand-1)", minHeight: "100vh" }}>
      <JsonLd
        data={breadcrumbJsonLd([
          { nome: "Início", url: "/" },
          { nome: copy.h1, url: `/${categoria}` },
        ])}
      />

      <Hero titulo={copy.h1} subtitulo={copy.subtitulo} imageSrc={CATEGORIA_IMAGE[cat]} />

      <div className="max-w-5xl mx-auto px-4 mt-2 mb-2">
        <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-2)", maxWidth: "62ch", margin: 0 }}>
          {copy.intro}
        </p>
      </div>

      <ListagemComercios
        categoriaFiltro={cat}
        subcategoriaParam={subcategoria}
        pageParam={page}
      />
    </div>
  )
}
