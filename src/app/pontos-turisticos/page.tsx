import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import type { CategoriaPonto, Dificuldade } from "@prisma/client"
import { MapPin, Route, Clock, Mountain } from "lucide-react"

export const metadata: Metadata = {
  title: "Pontos Turísticos | Guia SBS",
  description:
    "Mirantes, trilhas, cachoeiras e locais históricos de São Bento do Sapucaí, na Serra da Mantiqueira.",
}

const CATEGORIAS: { value: CategoriaPonto; label: string; cor: string }[] = [
  { value: "MIRANTE",  label: "Mirantes",        cor: "bg-sky-500" },
  { value: "TRILHA",   label: "Trilhas",          cor: "bg-green-600" },
  { value: "HISTORICO",label: "Histórico",        cor: "bg-amber-600" },
  { value: "CACHOEIRA",label: "Cachoeiras",       cor: "bg-cyan-600" },
]

const CATEGORIA_LABEL: Record<CategoriaPonto, string> = {
  MIRANTE:  "Mirante",
  TRILHA:   "Trilha",
  HISTORICO:"Histórico",
  CACHOEIRA:"Cachoeira",
}

const CATEGORIA_COR: Record<CategoriaPonto, string> = {
  MIRANTE:  "bg-sky-500",
  TRILHA:   "bg-green-600",
  HISTORICO:"bg-amber-600",
  CACHOEIRA:"bg-cyan-600",
}

const DIFICULDADE_LABEL: Record<Dificuldade, string> = {
  FACIL:    "Fácil",
  MODERADA: "Moderada",
  DIFICIL:  "Difícil",
}

const DIFICULDADE_COR: Record<Dificuldade, string> = {
  FACIL:    "bg-green-100 text-green-700",
  MODERADA: "bg-yellow-100 text-yellow-700",
  DIFICIL:  "bg-red-100 text-red-700",
}

const CATEGORIAS_VALIDAS = new Set<string>(["MIRANTE", "TRILHA", "HISTORICO", "CACHOEIRA"])

function formatDuracao(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default async function PontosTuristicosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}) {
  const { categoria } = await searchParams
  const categoriaFiltro =
    categoria && CATEGORIAS_VALIDAS.has(categoria.toUpperCase())
      ? (categoria.toUpperCase() as CategoriaPonto)
      : null

  const pontos = await prisma.pontoTuristico.findMany({
    where: {
      ativo: true,
      ...(categoriaFiltro ? { categoria: categoriaFiltro } : {}),
    },
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
  })

  return (
    <div style={{ background: "var(--sand-1)", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(160deg, #3a2615 0%, #6b3a1f 100%)",
          padding: "48px 24px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="grain" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-4"
            style={{ color: "rgba(245,240,232,.6)", letterSpacing: ".04em" }}
          >
            ← Início
          </Link>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
              fontWeight: 600,
              color: "#F8F2E6",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Pontos Turísticos
          </h1>
          <p style={{ color: "#EDE0C8", marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
            Mirantes, trilhas, cachoeiras e locais históricos na Serra da Mantiqueira
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Filtros de categoria */}
        <div className="flex gap-2 flex-wrap mb-8">
          <Link
            href="/pontos-turisticos"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={
              !categoriaFiltro
                ? { background: "var(--ink)", color: "var(--sand-1)" }
                : { background: "var(--sand-2)", color: "var(--ink-2)", border: "1px solid var(--sand-3)" }
            }
          >
            Todos
            {!categoriaFiltro && (
              <span
                style={{
                  background: "rgba(245,240,232,.25)",
                  borderRadius: 999,
                  fontSize: 11,
                  padding: "1px 7px",
                }}
              >
                {pontos.length}
              </span>
            )}
          </Link>
          {CATEGORIAS.map(({ value, label }) => {
            const ativo = categoriaFiltro === value
            return (
              <Link
                key={value}
                href={`/pontos-turisticos?categoria=${value}`}
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                style={
                  ativo
                    ? { background: "var(--ink)", color: "var(--sand-1)" }
                    : { background: "var(--sand-2)", color: "var(--ink-2)", border: "1px solid var(--sand-3)" }
                }
              >
                {label}
                {ativo && (
                  <span
                    style={{
                      background: "rgba(245,240,232,.25)",
                      borderRadius: 999,
                      fontSize: 11,
                      padding: "1px 7px",
                      marginLeft: 6,
                    }}
                  >
                    {pontos.length}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Grid */}
        {pontos.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--muted)" }}>
            <Mountain className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum ponto turístico encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {pontos.map((p) => (
              <Link
                key={p.id}
                href={`/pontos-turisticos/${p.slug}`}
                className="group rounded-2xl overflow-hidden block shadow-soft hover:-translate-y-0.5 transition-transform"
                style={{ background: "#fff" }}
              >
                {/* Foto */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {p.fotos[0] ? (
                    <Image
                      src={p.fotos[0]}
                      alt={p.nome}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "linear-gradient(145deg, var(--sand-2), var(--sand-3))" }}
                    >
                      <Mountain className="h-10 w-10" style={{ color: "var(--terra)", opacity: .4 }} />
                    </div>
                  )}
                  {/* Badge categoria */}
                  <span
                    className={`absolute top-2 left-2 ${CATEGORIA_COR[p.categoria]} text-white text-[10px] font-semibold px-2 py-0.5 rounded-full`}
                  >
                    {CATEGORIA_LABEL[p.categoria]}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-sm leading-tight line-clamp-1" style={{ color: "var(--ink)" }}>
                    {p.nome}
                  </p>
                  {p.descricao && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>
                      {p.descricao}
                    </p>
                  )}

                  {/* Chips específicos */}
                  {p.categoria === "TRILHA" && (p.dificuldade || p.distanciaKm || p.duracaoMin) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.dificuldade && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DIFICULDADE_COR[p.dificuldade]}`}>
                          {DIFICULDADE_LABEL[p.dificuldade]}
                        </span>
                      )}
                      {p.distanciaKm && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                          <Route className="h-2.5 w-2.5" />
                          {p.distanciaKm} km
                        </span>
                      )}
                      {p.duracaoMin && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDuracao(p.duracaoMin)}
                        </span>
                      )}
                    </div>
                  )}
                  {p.categoria === "MIRANTE" && p.altitudeM && (
                    <div className="flex gap-1 mt-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 inline-flex items-center gap-1">
                        <Mountain className="h-2.5 w-2.5" />
                        {p.altitudeM} m
                      </span>
                    </div>
                  )}
                  {p.categoria === "HISTORICO" && p.periodo && (
                    <p className="text-[10px] mt-1.5" style={{ color: "var(--amber)" }}>{p.periodo}</p>
                  )}
                  {p.cidade && (
                    <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <MapPin className="h-2.5 w-2.5" />
                      {p.cidade}{p.estado ? `/${p.estado}` : ""}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
