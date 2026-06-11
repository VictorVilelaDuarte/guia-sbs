import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Calendar, MapPin, Store, Ticket } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { PhotoPH } from "@/components/public/home/photo-ph"
import { formatDataEvento, formatPreco } from "@/lib/horarios"
import { eventoJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld"
import { JsonLd } from "@/components/seo/json-ld"
// Hero genérico (foto + overlay + HeroBottomCurve) — compartilhado com /comercios
import { Hero } from "../comercios/_components/hero"

export const metadata: Metadata = {
  title: "Eventos em São Bento do Sapucaí | Guia SBS",
  description:
    "Agenda de eventos de São Bento do Sapucaí: música ao vivo, festivais, promoções e experiências nos comércios da cidade, na Serra da Mantiqueira.",
  alternates: { canonical: "/eventos" },
}

// ISR — sem isso a página seria estática do build e a agenda congelaria
// (badges "HOJE" e eventos novos dependem do relógio)
export const revalidate = 1800

const TZ = "America/Sao_Paulo"

const PALETTES: [string, string, string][] = [
  ["#a06840", "#3a2010", "#6e4422"],
  ["#6b4a30", "#241808", "#4a3018"],
  ["#5a7040", "#1e2a10", "#3c5028"],
  ["#7a5a38", "#2a1e0c", "#523c22"],
]

function palette(id: string): [string, string, string] {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return PALETTES[hash % PALETTES.length]
}

function mesLabel(d: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    month: "long",
    year: "numeric",
  }).format(d)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function diaLocal(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d) // YYYY-MM-DD
}

export default async function EventosPage() {
  const agora = new Date()
  // início do dia local — eventos de hoje sem dataFim continuam visíveis
  const inicioDoDia = new Date(`${diaLocal(agora)}T00:00:00-03:00`)

  const eventos = await prisma.evento.findMany({
    where: {
      comercio: { status: "ATIVO" },
      OR: [
        { dataFim: { gte: agora } },
        { dataFim: null, dataInicio: { gte: inicioDoDia } },
      ],
    },
    select: {
      id: true,
      titulo: true,
      descricao: true,
      dataInicio: true,
      dataFim: true,
      imagem: true,
      local: true,
      preco: true,
      comercio: { select: { nome: true, slug: true } },
    },
    orderBy: { dataInicio: "asc" },
  })

  const hojeLocal = diaLocal(agora)

  // Agrupa por mês preservando a ordem cronológica
  const grupos: { label: string; eventos: typeof eventos }[] = []
  for (const e of eventos) {
    const label = mesLabel(e.dataInicio)
    const grupo = grupos.find((g) => g.label === label)
    if (grupo) grupo.eventos.push(e)
    else grupos.push({ label, eventos: [e] })
  }

  return (
    <div style={{ background: "var(--sand-1)", minHeight: "100vh" }}>
      <JsonLd
        data={breadcrumbJsonLd([
          { nome: "Início", url: "/" },
          { nome: "Eventos", url: "/eventos" },
        ])}
      />
      {eventos.map((e) => (
        <JsonLd key={e.id} data={eventoJsonLd(e, e.comercio)} />
      ))}

      <Hero
        titulo="Eventos na cidade"
        subtitulo="Música ao vivo, festivais e experiências em São Bento do Sapucaí"
        imageSrc="/assets/categorias/entretenimento.jpg"
      />

      <div className="max-w-2xl mx-auto px-5 pt-2 pb-16">
        {eventos.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <Calendar size={28} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
            <p className="serif" style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>
              Nenhum evento programado
            </p>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 20px" }}>
              Volte em breve — os comércios da cidade publicam novos eventos por aqui.
            </p>
            <Link
              href="/comercios"
              className="press"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "var(--ink)", color: "var(--sand-1)",
                padding: "11px 20px", borderRadius: 999,
                fontSize: 13.5, fontWeight: 700, textDecoration: "none",
              }}
            >
              Explorar comércios
            </Link>
          </div>
        )}

        {grupos.map((grupo) => (
          <section key={grupo.label} style={{ marginTop: 28 }}>
            <h2 className="serif" style={{
              fontSize: 18, fontWeight: 700, color: "var(--ink)",
              letterSpacing: "-0.01em", margin: "0 0 14px",
            }}>
              {grupo.label}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {grupo.eventos.map((e) => {
                const ehHoje = diaLocal(e.dataInicio) === hojeLocal
                const emAndamento =
                  !ehHoje && e.dataInicio <= agora && !!e.dataFim && e.dataFim >= agora
                return (
                  <Link
                    key={e.id}
                    href={`/vitrine/${e.comercio.slug}?src=eventos`}
                    className="press shadow-soft"
                    style={{
                      display: "flex", gap: 14,
                      background: "var(--sand-2)",
                      border: "1px solid rgba(212,201,176,.55)",
                      borderRadius: 18, padding: 12,
                      textDecoration: "none", color: "var(--ink)",
                    }}
                  >
                    {/* Thumb */}
                    <div style={{
                      position: "relative", width: 88, height: 88,
                      borderRadius: 12, overflow: "hidden", flexShrink: 0,
                    }}>
                      {e.imagem ? (
                        <Image
                          src={e.imagem}
                          alt={`${e.titulo} — evento em São Bento do Sapucaí`}
                          fill
                          sizes="88px"
                          className="object-cover"
                        />
                      ) : (
                        <PhotoPH palette={palette(e.id)} label={e.titulo} ratio="auto" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 11, fontWeight: 700, color: "var(--terra)",
                        }}>
                          <Calendar size={11} />
                          {formatDataEvento(e.dataInicio, e.dataFim)}
                        </span>
                        {ehHoje && (
                          <span style={{
                            fontSize: 9.5, fontWeight: 800, letterSpacing: ".05em",
                            background: "#dcfce7", color: "#15803d",
                            padding: "2px 7px", borderRadius: 999,
                          }}>
                            HOJE
                          </span>
                        )}
                        {emAndamento && (
                          <span style={{
                            fontSize: 9.5, fontWeight: 800, letterSpacing: ".05em",
                            background: "rgba(196,135,58,.15)", color: "var(--terra)",
                            padding: "2px 7px", borderRadius: 999,
                          }}>
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>

                      <p className="serif" style={{
                        fontSize: 15.5, fontWeight: 700, lineHeight: 1.25,
                        margin: 0,
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>
                        {e.titulo}
                      </p>

                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11.5, color: "var(--muted)",
                        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                      }}>
                        <Store size={11} style={{ flexShrink: 0 }} />
                        {e.comercio.nome}
                      </span>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto" }}>
                        {e.local && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 11, color: "var(--muted)",
                            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                            minWidth: 0,
                          }}>
                            <MapPin size={10} style={{ flexShrink: 0 }} />
                            {e.local}
                          </span>
                        )}
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 11.5, fontWeight: 700, flexShrink: 0,
                          color: e.preco === null || e.preco === 0 ? "#15803d" : "var(--terra)",
                          marginLeft: "auto",
                        }}>
                          <Ticket size={11} />
                          {e.preco === null || e.preco === 0 ? "Gratuito" : formatPreco(e.preco)}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
