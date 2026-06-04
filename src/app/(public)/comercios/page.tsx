import { prisma } from "@/lib/prisma"
import { parseHorarios, getDiaAtual, estaAbertoAgora } from "@/lib/horarios"
import type { Metadata } from "next"
import type { Categoria } from "@prisma/client"
import { Hero } from "./_components/hero"
import { Filtros } from "./_components/filtros"
import { CardComercio } from "./_components/card-comercio"
import { Paginacao } from "./_components/paginacao"
import {
  CATEGORIAS_VALIDAS,
  CATEGORIA_LABEL,
  CATEGORIA_IMAGE,
  DEFAULT_IMAGE,
} from "./_utils"

const PAGE_SIZE = 12

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}): Promise<Metadata> {
  const { categoria } = await searchParams
  const cat = categoria && CATEGORIAS_VALIDAS.has(categoria.toUpperCase() as Categoria)
    ? (categoria.toUpperCase() as Categoria)
    : null
  return {
    title: cat ? `${CATEGORIA_LABEL[cat]} | Guia SBS` : "Comércios | Guia SBS",
    description: "Encontre restaurantes, pousadas, serviços e mais em São Bento do Sapucaí.",
  }
}

export default async function ComerciosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; subcategoria?: string; page?: string }>
}) {
  const { categoria, subcategoria, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))

  const categoriaFiltro = categoria && CATEGORIAS_VALIDAS.has(categoria.toUpperCase() as Categoria)
    ? (categoria.toUpperCase() as Categoria)
    : null

  const subcategorias = categoriaFiltro
    ? await prisma.subcategoria.findMany({
        where: { categoria: categoriaFiltro, ativo: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true },
      })
    : []

  const subcategoriaFiltro = subcategoria && subcategorias.some((s) => s.id === subcategoria)
    ? subcategoria
    : null

  const where = {
    status: "ATIVO" as const,
    ...(categoriaFiltro ? { categorias: { has: categoriaFiltro } } : {}),
    ...(subcategoriaFiltro ? { subcategorias: { some: { id: subcategoriaFiltro } } } : {}),
  }

  const [comercios, total] = await Promise.all([
    prisma.comercio.findMany({
      where,
      select: {
        slug: true,
        nome: true,
        logo: true,
        categorias: true,
        descricao: true,
        horarios: true,
        cidade: true,
        estado: true,
        subcategorias: { select: { id: true, nome: true }, orderBy: { ordem: "asc" } },
        fotos: { take: 1, orderBy: { ordem: "asc" }, select: { url: true } },
      },
      orderBy: { nome: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.comercio.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const dia = getDiaAtual()
  const items = comercios.map((c) => {
    const horarios = parseHorarios(c.horarios)
    const hoje = horarios?.find((h) => h.dia === dia) ?? null
    const statusAgora = hoje && horarios ? estaAbertoAgora(hoje, horarios) : null
    return { ...c, statusAgora }
  })

  items.sort((a, b) => {
    const aOpen = a.statusAgora?.aberto ? 0 : 1
    const bOpen = b.statusAgora?.aberto ? 0 : 1
    return aOpen - bOpen || a.nome.localeCompare(b.nome, "pt-BR")
  })

  const titulo = categoriaFiltro ? CATEGORIA_LABEL[categoriaFiltro] : "Comércios"
  const subtitulo = categoriaFiltro
    ? `${total} estabelecimento${total !== 1 ? "s" : ""} em São Bento do Sapucaí`
    : "Restaurantes, pousadas, serviços e muito mais em São Bento do Sapucaí"
  const headerImage = categoriaFiltro ? CATEGORIA_IMAGE[categoriaFiltro] : DEFAULT_IMAGE

  return (
    <div style={{ background: "var(--sand-1)", minHeight: "100vh" }}>
      <Hero titulo={titulo} subtitulo={subtitulo} imageSrc={headerImage} />

      <div className="max-w-5xl mx-auto px-4 pb-12 mt-4">
        <Filtros
          categoriaFiltro={categoriaFiltro}
          subcategoriaFiltro={subcategoriaFiltro}
          subcategorias={subcategorias}
        />

        {items.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--muted)" }}>
            <p className="text-sm">Nenhum comércio encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((c) => (
              <CardComercio key={c.slug} item={c} categoriaFiltro={categoriaFiltro} />
            ))}
          </div>
        )}

        <Paginacao
          page={page}
          totalPages={totalPages}
          categoriaFiltro={categoriaFiltro}
          subcategoriaFiltro={subcategoriaFiltro}
        />
      </div>
    </div>
  )
}
