import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  Mountain, CarFront, CloudSun, Compass, UtensilsCrossed,
  Camera, MapPin, Snowflake, Sun, Leaf, ArrowRight,
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { HeroBottomCurve } from "@/components/public/home/waves"
import { cidadeJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld"
import { JsonLd } from "@/components/seo/json-ld"

export const metadata: Metadata = {
  title: "São Bento do Sapucaí — guia completo da cidade | Guia SBS",
  description:
    "Tudo sobre São Bento do Sapucaí: como chegar, quando ir, o que fazer, Pedra do Baú, trilhas, cachoeiras e a gastronomia da Serra da Mantiqueira.",
  alternates: { canonical: "/sao-bento-do-sapucai" },
}

// Conteúdo quase estático (interlinka pontos turísticos do banco) — ISR de 1h
export const revalidate = 3600

const FOTOS_CIDADE = [
  { src: "/assets/home/sbs.jpg",                     alt: "Vista de São Bento do Sapucaí na Serra da Mantiqueira" },
  { src: "/assets/categorias/turismo.jpg",           alt: "Pedra do Baú, cartão-postal de São Bento do Sapucaí" },
  { src: "/assets/home/sbs1.jpg",                    alt: "Paisagem de montanha em São Bento do Sapucaí" },
  { src: "/assets/categorias/hospedagem.jpg",        alt: "Hospedagem na serra em São Bento do Sapucaí" },
  { src: "/assets/categorias/alimentacao.jpg",       alt: "Gastronomia da serra em São Bento do Sapucaí" },
  { src: "/assets/categorias/entretenimento.jpg",    alt: "Vida cultural e eventos em São Bento do Sapucaí" },
]

const COMO_CHEGAR = [
  { de: "São Paulo (capital)",  info: "≈ 180 km · ~3h de carro, via Fernão Dias (BR-381)" },
  { de: "Campos do Jordão",     info: "≈ 25 km · ~40 min por estrada de serra" },
  { de: "Campinas",             info: "≈ 170 km · ~2h45 de carro" },
  { de: "Aeroportos",           info: "Guarulhos (GRU) ou Viracopos (VCP), e o trecho final de carro" },
]

const ESTACOES = [
  {
    icon: Snowflake,
    titulo: "Inverno (jun–ago)",
    desc: "Alta temporada: frio de serra, céu limpo e visual perfeito da Pedra do Baú. Noites pedem lareira e fondue — leve agasalho de verdade.",
  },
  {
    icon: Sun,
    titulo: "Verão (dez–mar)",
    desc: "Tudo verde, cachoeiras cheias e dias quentes com pancadas de chuva à tarde. Melhor época para banho de cachoeira.",
  },
  {
    icon: Leaf,
    titulo: "Outono e primavera",
    desc: "Meia estação tranquila: clima ameno, cidade mais vazia e preços melhores — ótima para trilhas longas.",
  },
]

const SABORES = [
  "Truta da serra, criada nas águas frias da região",
  "Pinhão — símbolo da Mantiqueira no inverno",
  "Café colhido nas montanhas e doces de roça",
  "Queijos artesanais e produtos da agricultura familiar",
]

export default async function CidadePage() {
  const pontos = await prisma.pontoTuristico.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    take: 6,
    select: { nome: true, slug: true, fotos: true, categoria: true },
  })

  return (
    <div style={{ background: "var(--sand-1)", minHeight: "100vh" }}>
      <JsonLd
        data={cidadeJsonLd({
          imagens: FOTOS_CIDADE.map((f) => f.src),
          atracoes: pontos.map((p) => ({ nome: p.nome, slug: p.slug })),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { nome: "Início", url: "/" },
          { nome: "São Bento do Sapucaí", url: "/sao-bento-do-sapucai" },
        ])}
      />

      {/* ── HERO ── */}
      <div style={{ position: "relative", padding: "84px 24px 96px", background: "var(--sand-1)" }}>
        <Image
          src="/assets/home/sbs1.jpg"
          alt="São Bento do Sapucaí vista do alto, com a Serra da Mantiqueira ao fundo"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(26,13,4,.58)" }} />
        <div className="grain" />
        <div className="max-w-2xl mx-auto relative z-10" style={{ textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "rgba(245,240,232,.75)", fontSize: 11.5, fontWeight: 700,
            letterSpacing: ".18em", marginBottom: 14,
          }}>
            <MapPin size={12} />
            SERRA DA MANTIQUEIRA · SP
          </div>
          <h1 className="serif" style={{
            fontSize: "clamp(2rem, 8vw, 3.2rem)",
            fontWeight: 700, color: "#F8F2E6",
            letterSpacing: "-0.03em", lineHeight: 1.05, margin: 0,
            textShadow: "0 2px 20px rgba(20,12,5,.5)",
          }}>
            São Bento do Sapucaí
          </h1>
          <p style={{
            color: "#EDE0C8", marginTop: 14, fontSize: 15, lineHeight: 1.65,
            maxWidth: 440, marginLeft: "auto", marginRight: "auto",
            textShadow: "0 1px 8px rgba(20,12,5,.55)",
          }}>
            Aos pés da Pedra do Baú, a cidade que virou destino de quem busca
            montanha, natureza e comida de serra — a poucas horas de São Paulo.
          </p>
        </div>
        <HeroBottomCurve color="var(--sand-1)" />
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-16">

        {/* ── A CIDADE ── */}
        <section style={{ marginTop: 8 }}>
          <h2 className="serif" style={{
            fontSize: 22, fontWeight: 700, color: "var(--ink)",
            letterSpacing: "-0.02em", margin: "0 0 12px",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            <Mountain size={19} style={{ color: "var(--terra)" }} />
            A cidade
          </h2>
          <div style={{ fontSize: 14.5, lineHeight: 1.75, color: "var(--ink-2)", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0 }}>
              Fundada no século XIX às margens do rio Sapucaí-Guaçu, São Bento do
              Sapucaí cresceu entre as montanhas da Serra da Mantiqueira, na divisa
              de São Paulo com Minas Gerais. O centro histórico guarda o ritmo de
              cidade pequena: igreja matriz, praça arborizada, casarios e o comércio
              local que abastece moradores e visitantes.
            </p>
            <p style={{ margin: 0 }}>
              O cartão-postal é a <strong>Pedra do Baú</strong>, o gigante de granito
              de quase 2.000 metros de altitude que atrai escaladores do Brasil
              inteiro — a cidade é um dos principais destinos de escalada e esportes
              de montanha do país. Em volta dela, um mosaico de trilhas, mirantes,
              cachoeiras e estradas rurais com paisagens que mudam a cada estação.
            </p>
          </div>
        </section>

        {/* ── FAIXA DE FOTOS ── */}
        <section style={{ marginTop: 28 }}>
          <div className="h-scroll no-scrollbar" style={{ paddingBottom: 8 }}>
            {FOTOS_CIDADE.map((f) => (
              <div
                key={f.src}
                className="shadow-card"
                style={{
                  position: "relative", width: 230, height: 160,
                  borderRadius: 18, overflow: "hidden", flexShrink: 0,
                }}
              >
                <Image src={f.src} alt={f.alt} fill className="object-cover" sizes="230px" />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5, margin: "4px 2px 0" }}>
            <Camera size={11} />
            São Bento do Sapucaí em imagens
          </p>
        </section>

        {/* ── COMO CHEGAR ── */}
        <section style={{ marginTop: 36 }}>
          <h2 className="serif" style={{
            fontSize: 22, fontWeight: 700, color: "var(--ink)",
            letterSpacing: "-0.02em", margin: "0 0 14px",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            <CarFront size={19} style={{ color: "var(--terra)" }} />
            Como chegar
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {COMO_CHEGAR.map((c) => (
              <div key={c.de} style={{
                background: "var(--sand-2)",
                border: "1px solid rgba(212,201,176,.55)",
                borderRadius: 14, padding: "13px 16px",
              }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{c.de}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{c.info}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── QUANDO IR ── */}
        <section style={{ marginTop: 36 }}>
          <h2 className="serif" style={{
            fontSize: 22, fontWeight: 700, color: "var(--ink)",
            letterSpacing: "-0.02em", margin: "0 0 14px",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            <CloudSun size={19} style={{ color: "var(--terra)" }} />
            Quando ir
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ESTACOES.map(({ icon: Icon, titulo, desc }) => (
              <div key={titulo} style={{
                background: "var(--sand-2)",
                border: "1px solid rgba(212,201,176,.55)",
                borderRadius: 14, padding: "14px 16px",
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(196,135,58,.12)", color: "var(--terra)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>{titulo}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── O QUE FAZER (pontos turísticos reais) ── */}
        {pontos.length > 0 && (
          <section style={{ marginTop: 36 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 className="serif" style={{
                fontSize: 22, fontWeight: 700, color: "var(--ink)",
                letterSpacing: "-0.02em", margin: 0,
                display: "flex", alignItems: "center", gap: 9,
              }}>
                <Compass size={19} style={{ color: "var(--terra)" }} />
                O que fazer
              </h2>
              <Link href="/pontos-turisticos" style={{ fontSize: 12, fontWeight: 600, color: "var(--terra)", textDecoration: "none" }}>
                Ver todos →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {pontos.map((p) => (
                <Link
                  key={p.slug}
                  href={`/pontos-turisticos/${p.slug}`}
                  className="press shadow-soft"
                  style={{
                    position: "relative", height: 120,
                    borderRadius: 16, overflow: "hidden",
                    textDecoration: "none", display: "block",
                    background: "var(--sand-2)",
                  }}
                >
                  {p.fotos[0] && (
                    <Image
                      src={p.fotos[0]}
                      alt={`${p.nome} — São Bento do Sapucaí`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 280px"
                    />
                  )}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(26,13,4,.72), rgba(26,13,4,.05) 55%)",
                  }} />
                  <span style={{
                    position: "absolute", left: 12, right: 12, bottom: 10,
                    color: "#F8F2E6", fontSize: 13, fontWeight: 700, lineHeight: 1.25,
                    textShadow: "0 1px 6px rgba(20,12,5,.6)",
                  }}>
                    {p.nome}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/mapa"
              className="press"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                marginTop: 12, padding: "12px",
                background: "var(--sand-2)", border: "1px solid rgba(212,201,176,.6)",
                borderRadius: 14, fontSize: 13, fontWeight: 700,
                color: "var(--ink)", textDecoration: "none",
              }}
            >
              <MapPin size={14} style={{ color: "var(--terra)" }} />
              Ver tudo no mapa interativo
            </Link>
          </section>
        )}

        {/* ── SABORES ── */}
        <section style={{ marginTop: 36 }}>
          <h2 className="serif" style={{
            fontSize: 22, fontWeight: 700, color: "var(--ink)",
            letterSpacing: "-0.02em", margin: "0 0 12px",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            <UtensilsCrossed size={19} style={{ color: "var(--terra)" }} />
            Sabores da serra
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)", margin: "0 0 12px" }}>
            A cozinha de São Bento é a cozinha da montanha — ingredientes locais,
            receitas de família e o frio que pede mesa farta:
          </p>
          <ul style={{ margin: "0 0 16px", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {SABORES.map((s) => (
              <li key={s} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--terra)", marginTop: 7, flexShrink: 0 }} />
                {s}
              </li>
            ))}
          </ul>
          <Link
            href="/comercios?categoria=ALIMENTACAO"
            className="press"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "var(--ink)", color: "var(--sand-1)",
              padding: "12px 20px", borderRadius: 999,
              fontSize: 13.5, fontWeight: 700, textDecoration: "none",
            }}
          >
            Onde comer na cidade
            <ArrowRight size={14} />
          </Link>
        </section>
      </div>
    </div>
  )
}
