import { prisma } from "@/lib/prisma"
import { parseHorarios, getDiaAtual, estaAbertoAgora } from "@/lib/horarios"
import type { Categoria } from "@prisma/client"
import { Filtros } from "./filtros"
import { CardComercio } from "./card-comercio"
import { Paginacao } from "./paginacao"

const PAGE_SIZE = 12

interface Props {
  categoriaFiltro: Categoria | null
  subcategoriaParam?: string
  pageParam?: string
}

// Corpo da listagem de comércios — compartilhado entre /comercios (sem
// filtro) e as rotas dedicadas de categoria (/gastronomia, /hospedagem, …).
// Server Component: busca, ordena (abertos primeiro) e compõe filtros,
// grid e paginação.
export async function ListagemComercios({ categoriaFiltro, subcategoriaParam, pageParam }: Props) {
  const page = Math.max(1, Number(pageParam ?? 1))

  const subcategorias = categoriaFiltro
    ? await prisma.subcategoria.findMany({
        where: { categoria: categoriaFiltro, ativo: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true },
      })
    : []

  const subcategoriaFiltro = subcategoriaParam && subcategorias.some((s) => s.id === subcategoriaParam)
    ? subcategoriaParam
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

  return (
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
  )
}
