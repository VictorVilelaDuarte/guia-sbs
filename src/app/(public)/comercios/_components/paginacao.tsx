import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Categoria } from "@prisma/client"
import { pageUrl } from "../_utils"

interface Props {
  page: number
  totalPages: number
  categoriaFiltro: Categoria | null
  subcategoriaFiltro: string | null
}

const btnBase = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "9px 16px", borderRadius: 12,
  background: "var(--sand-2)",
  fontSize: 13, fontWeight: 600,
  textDecoration: "none",
} as const

export function Paginacao({ page, totalPages, categoriaFiltro, subcategoriaFiltro }: Props) {
  if (totalPages <= 1) return null

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 40 }}>
      {page > 1 ? (
        <Link
          href={pageUrl(page - 1, categoriaFiltro, subcategoriaFiltro)}
          style={{ ...btnBase, border: "1px solid rgba(212,201,176,.6)", color: "var(--ink)" }}
        >
          <ChevronLeft size={15} /> Anterior
        </Link>
      ) : (
        <span style={{ ...btnBase, border: "1px solid rgba(212,201,176,.3)", color: "var(--muted)", opacity: 0.5 }}>
          <ChevronLeft size={15} /> Anterior
        </span>
      )}

      <span style={{ fontSize: 13, color: "var(--ink-2)", padding: "0 8px" }}>
        {page} de {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={pageUrl(page + 1, categoriaFiltro, subcategoriaFiltro)}
          style={{ ...btnBase, border: "1px solid rgba(212,201,176,.6)", color: "var(--ink)" }}
        >
          Próxima <ChevronRight size={15} />
        </Link>
      ) : (
        <span style={{ ...btnBase, border: "1px solid rgba(212,201,176,.3)", color: "var(--muted)", opacity: 0.5 }}>
          Próxima <ChevronRight size={15} />
        </span>
      )}
    </div>
  )
}
