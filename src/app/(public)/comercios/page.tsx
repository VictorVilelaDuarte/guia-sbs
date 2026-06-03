import { prisma } from "@/lib/prisma"
import { parseHorarios, getDiaAtual, estaAbertoAgora } from "@/lib/horarios"
import type { Metadata } from "next"
import type { Categoria } from "@prisma/client"
import Image from "next/image"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { PhotoPH } from "@/components/public/home/photo-ph"

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "ALIMENTACAO",    label: "Alimentação"    },
  { value: "HOSPEDAGEM",     label: "Hospedagem"     },
  { value: "TURISMO",        label: "Turismo"        },
  { value: "SERVICO",        label: "Serviço"        },
  { value: "COMERCIO",       label: "Comércio"       },
  { value: "ENTRETENIMENTO", label: "Entretenimento" },
]

const CATEGORIA_LABEL: Record<Categoria, string> = Object.fromEntries(
  CATEGORIAS.map((c) => [c.value, c.label])
) as Record<Categoria, string>

const CATEGORIAS_VALIDAS = new Set(CATEGORIAS.map((c) => c.value))

// Imagens de fundo por categoria.
// Adicione /public/assets/categorias/{value.toLowerCase()}.jpg para imagens específicas.
const CATEGORIA_IMAGE: Record<Categoria, string> = {
  ALIMENTACAO:    "/assets/home/sbs1.jpg",
  HOSPEDAGEM:     "/assets/home/sbs2.webp",
  TURISMO:        "/assets/home/sbs.jpg",
  SERVICO:        "/assets/home/background-sbs.png",
  COMERCIO:       "/assets/home/sbs2.webp",
  ENTRETENIMENTO: "/assets/home/sbs.jpg",
}
const DEFAULT_IMAGE = "/assets/home/sbs1.jpg"

const PALETTES: [string, string, string][] = [
  ["#a06440", "#3d2616", "#6b3a1d"],
  ["#c4873a", "#5b3a1a", "#8b5a2a"],
  ["#8a7c5a", "#3a2c14", "#6b5634"],
  ["#9c5a30", "#3a200e", "#7a4220"],
  ["#6b8550", "#2a3818", "#4d6038"],
  ["#5a7a8a", "#1a2c3a", "#3a5a68"],
]
function palette(slug: string): [string, string, string] {
  const hash = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return PALETTES[hash % PALETTES.length]
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}): Promise<Metadata> {
  const { categoria } = await searchParams
  const cat = categoria && CATEGORIAS_VALIDAS.has(categoria.toUpperCase() as Categoria)
    ? (categoria.toUpperCase() as Categoria)
    : null
  const titulo = cat ? `${CATEGORIA_LABEL[cat]} | Guia SBS` : "Comércios | Guia SBS"
  return {
    title: titulo,
    description: "Encontre restaurantes, pousadas, serviços e mais em São Bento do Sapucaí.",
  }
}

export default async function ComerciosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; subcategoria?: string }>
}) {
  const { categoria, subcategoria } = await searchParams

  const categoriaFiltro =
    categoria && CATEGORIAS_VALIDAS.has(categoria.toUpperCase() as Categoria)
      ? (categoria.toUpperCase() as Categoria)
      : null

  // Busca subcategorias disponíveis quando há categoria selecionada
  const subcategorias = categoriaFiltro
    ? await prisma.subcategoria.findMany({
        where: { categoria: categoriaFiltro, ativo: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: { id: true, nome: true },
      })
    : []

  const subcategoriaFiltro =
    subcategoria && subcategorias.some((s) => s.id === subcategoria)
      ? subcategoria
      : null

  const comercios = await prisma.comercio.findMany({
    where: {
      status: "ATIVO",
      ...(categoriaFiltro ? { categorias: { has: categoriaFiltro } } : {}),
      ...(subcategoriaFiltro ? { subcategorias: { some: { id: subcategoriaFiltro } } } : {}),
    },
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
  })

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
    ? `${items.length} estabelecimento${items.length !== 1 ? "s" : ""} em São Bento do Sapucaí`
    : "Restaurantes, pousadas, serviços e muito mais em São Bento do Sapucaí"
  const headerImage = categoriaFiltro ? CATEGORIA_IMAGE[categoriaFiltro] : DEFAULT_IMAGE

  return (
    <div style={{ background: "var(--sand-1)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        padding: "48px 24px 56px",
        background: "var(--sand-1)",
      }}>
        {/* Imagem de fundo */}
        <Image
          src={headerImage}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        {/* Overlay escuro */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(30,16,6,.62)" }} />
        <div className="grain" />

        {/* Texto */}
        <div className="max-w-5xl mx-auto relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-4"
            style={{ color: "rgba(245,240,232,.6)", letterSpacing: ".04em" }}
          >
            ← Início
          </Link>
          <h1 className="serif" style={{
            fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
            fontWeight: 600,
            color: "#F8F2E6",
            letterSpacing: "-0.02em",
            margin: 0,
            textShadow: "0 2px 16px rgba(20,12,5,.45)",
          }}>
            {titulo}
          </h1>
          <p style={{
            color: "#EDE0C8",
            marginTop: 8,
            fontSize: 14,
            lineHeight: 1.5,
            textShadow: "0 1px 6px rgba(20,12,5,.5)",
          }}>
            {subtitulo}
          </p>
        </div>

        {/* Onda — dentro do overflow:hidden.
            Path começa em y=0 em ambos os lados: sem cantos transparentes nas laterais.
            bottom:0 (sem -1): sem borda na base. */}
        <svg
          width="100%"
          height="56"
          viewBox="0 0 1000 56"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        >
          <path
            d="M0,0 C250,56 350,4 500,32 C650,54 750,2 1000,0 L1000,56 L0,56 Z"
            fill="var(--sand-1)"
          />
        </svg>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Filtros por subcategoria (quando categoria selecionada) */}
        {categoriaFiltro && subcategorias.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            <Link
              href={`/comercios?categoria=${categoriaFiltro}`}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={!subcategoriaFiltro
                ? { background: "var(--ink)", color: "var(--sand-1)" }
                : { background: "var(--sand-2)", color: "var(--ink-2)", border: "1px solid var(--sand-3)" }}
            >
              Todos
            </Link>
            {subcategorias.map((s) => {
              const ativo = subcategoriaFiltro === s.id
              return (
                <Link
                  key={s.id}
                  href={`/comercios?categoria=${categoriaFiltro}&subcategoria=${s.id}`}
                  className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                  style={ativo
                    ? { background: "var(--ink)", color: "var(--sand-1)" }
                    : { background: "var(--sand-2)", color: "var(--ink-2)", border: "1px solid var(--sand-3)" }}
                >
                  {s.nome}
                </Link>
              )
            })}
          </div>
        )}

        {/* Filtros por categoria (quando nenhuma categoria selecionada) */}
        {!categoriaFiltro && (
          <div className="flex gap-2 flex-wrap mb-8">
            {CATEGORIAS.map(({ value, label }) => (
              <Link
                key={value}
                href={`/comercios?categoria=${value}`}
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                style={{ background: "var(--sand-2)", color: "var(--ink-2)", border: "1px solid var(--sand-3)" }}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Grid */}
        {items.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--muted)" }}>
            <p className="text-sm">Nenhum comércio encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((c) => {
              const coverUrl = c.fotos[0]?.url ?? null
              return (
                <Link
                  key={c.slug}
                  href={`/vitrine/${c.slug}`}
                  className="group rounded-2xl overflow-hidden block shadow-soft hover:-translate-y-0.5 transition-transform"
                  style={{ background: "#fff" }}
                >
                  {/* Imagem */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={c.nome}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : c.logo ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#f5f0e8] p-4">
                        <Image
                          src={c.logo}
                          alt={c.nome}
                          fill
                          className="object-contain p-4"
                          sizes="(max-width: 640px) 50vw, 25vw"
                        />
                      </div>
                    ) : (
                      <PhotoPH palette={palette(c.slug)} label={c.slug} ratio="4/3" />
                    )}

                    {/* Badge status */}
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

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-semibold text-sm leading-tight line-clamp-1" style={{ color: "var(--ink)" }}>
                      {c.nome}
                    </p>

                    {/* Subcategoria principal (quando há filtro de categoria) ou categoria */}
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
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
