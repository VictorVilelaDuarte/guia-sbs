import Link from "next/link"
import type { Categoria } from "@prisma/client"
import { CATEGORIAS } from "../_utils"

interface Props {
  categoriaFiltro: Categoria | null
  subcategoriaFiltro: string | null
  subcategorias: { id: string; nome: string }[]
}

const ativo   = { background: "var(--ink)",   color: "var(--sand-1)" }
const inativo = { background: "var(--sand-2)", color: "var(--ink-2)", border: "1px solid var(--sand-3)" }

export function Filtros({ categoriaFiltro, subcategoriaFiltro, subcategorias }: Props) {
  if (categoriaFiltro && subcategorias.length > 0) {
    return (
      <div className="flex gap-2 flex-wrap mb-8">
        <Link
          href={`/comercios?categoria=${categoriaFiltro}`}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium"
          style={!subcategoriaFiltro ? ativo : inativo}
        >
          Todos
        </Link>
        {subcategorias.map((s) => (
          <Link
            key={s.id}
            href={`/comercios?categoria=${categoriaFiltro}&subcategoria=${s.id}`}
            className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
            style={subcategoriaFiltro === s.id ? ativo : inativo}
          >
            {s.nome}
          </Link>
        ))}
      </div>
    )
  }

  if (!categoriaFiltro) {
    return (
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIAS.map(({ value, label }) => (
          <Link
            key={value}
            href={`/comercios?categoria=${value}`}
            className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
            style={inativo}
          >
            {label}
          </Link>
        ))}
      </div>
    )
  }

  return null
}
