import Image from "next/image"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { PhotoPH } from "@/components/public/home/photo-ph"
import type { Categoria } from "@prisma/client"
import { CATEGORIA_LABEL, palette } from "../_utils"

export interface ComercioItem {
  slug: string
  nome: string
  logo: string | null
  categorias: Categoria[]
  descricao: string | null
  cidade: string | null
  estado: string | null
  subcategorias: { id: string; nome: string }[]
  fotos: { url: string }[]
  statusAgora: { aberto: boolean } | null
  precoDesde?: number | null
}

interface Props {
  item: ComercioItem
  categoriaFiltro: Categoria | null
}

export function CardComercio({ item: c, categoriaFiltro }: Props) {
  const coverUrl = c.fotos[0]?.url ?? null

  return (
    <Link
      href={`/vitrine/${c.slug}?src=listagem`}
      className="group rounded-2xl overflow-hidden block shadow-soft hover:-translate-y-0.5 transition-transform"
      style={{ background: "#fff" }}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`${c.nome} em São Bento do Sapucaí`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : c.logo ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f0e8]">
            <Image
              src={c.logo}
              alt={`Logo de ${c.nome}`}
              fill
              className="object-contain p-4"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          </div>
        ) : (
          <PhotoPH palette={palette(c.slug)} label={c.slug} ratio="4/3" />
        )}

        {c.statusAgora && (
          <div style={{
            position: "absolute", bottom: 8, left: 8,
            background: c.statusAgora.aberto ? "#dfe7d4" : "rgba(245,240,232,.92)",
            color: c.statusAgora.aberto ? "#4a5d3a" : "#6b5c44",
            padding: "4px 9px", borderRadius: 999,
            fontSize: 10, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 4,
            border: c.statusAgora.aberto
              ? "1px solid rgba(120,140,100,.25)"
              : "1px solid rgba(212,201,176,.5)",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: 999,
              background: c.statusAgora.aberto ? "#6b8550" : "#a09080",
            }} />
            {c.statusAgora.aberto ? "Aberto" : "Fechado"}
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-semibold text-sm leading-tight line-clamp-1" style={{ color: "var(--ink)" }}>
          {c.nome}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--terra)" }}>
          {categoriaFiltro
            ? (c.subcategorias[0]?.nome ?? CATEGORIA_LABEL[c.categorias[0]])
            : CATEGORIA_LABEL[c.categorias[0]]}
        </p>
        {c.descricao && (
          <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "var(--muted)" }}>
            {c.descricao}
          </p>
        )}
        {c.cidade && (
          <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: "var(--muted)" }}>
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {c.cidade}{c.estado ? `/${c.estado}` : ""}
          </p>
        )}
        {c.precoDesde != null && (
          <p className="text-xs mt-2 font-semibold" style={{ color: "var(--ink)" }}>
            <span className="font-normal" style={{ color: "var(--muted)" }}>a partir de </span>
            {c.precoDesde.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            <span className="font-normal" style={{ color: "var(--muted)" }}>/noite</span>
          </p>
        )}
      </div>
    </Link>
  )
}
