import { permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import type { Categoria } from "@prisma/client"
import { categoriaPath } from "@/lib/seo/categorias"
import { Hero } from "./_components/hero"
import { ListagemComercios } from "./_components/listagem"
import { CATEGORIAS_VALIDAS, DEFAULT_IMAGE } from "./_utils"

export const metadata: Metadata = {
  title: "Comércios | Guia SBS",
  description: "Encontre restaurantes, pousadas, serviços e mais em São Bento do Sapucaí.",
  alternates: { canonical: "/comercios" },
}

export default async function ComerciosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; subcategoria?: string; page?: string }>
}) {
  const { categoria, subcategoria, page } = await searchParams

  // URLs antigas com query param viram redirect 308 para a rota dedicada
  // (/gastronomia, /hospedagem, …) — evita conteúdo duplicado e corrige
  // links já compartilhados/indexados.
  const categoriaFiltro = categoria && CATEGORIAS_VALIDAS.has(categoria.toUpperCase() as Categoria)
    ? (categoria.toUpperCase() as Categoria)
    : null
  if (categoriaFiltro) {
    const params = new URLSearchParams()
    if (subcategoria) params.set("subcategoria", subcategoria)
    if (page) params.set("page", page)
    const qs = params.toString()
    permanentRedirect(`${categoriaPath(categoriaFiltro)}${qs ? `?${qs}` : ""}`)
  }

  return (
    <div style={{ background: "var(--sand-1)", minHeight: "100vh" }}>
      <Hero
        titulo="Comércios"
        subtitulo="Restaurantes, pousadas, serviços e muito mais em São Bento do Sapucaí"
        imageSrc={DEFAULT_IMAGE}
      />
      <ListagemComercios categoriaFiltro={null} pageParam={page} />
    </div>
  )
}
