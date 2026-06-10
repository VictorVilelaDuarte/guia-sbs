import Link from "next/link";
import Image from "next/image";
import { PhotoPH } from "./photo-ph";
import type { PontoTuristicoHome } from "@/app/(public)/home-client";

const CATEGORIA_LABEL: Record<string, string> = {
  MIRANTE: "Mirante",
  TRILHA: "Trilha",
  HISTORICO: "Histórico",
  CACHOEIRA: "Cachoeira",
};

const CATEGORIA_BADGE: Record<string, { bg: string; color: string }> = {
  MIRANTE: { bg: "rgba(224,242,254,.92)", color: "#0369a1" },
  TRILHA: { bg: "rgba(220,252,231,.92)", color: "#166534" },
  HISTORICO: { bg: "rgba(254,243,199,.92)", color: "#92400e" },
  CACHOEIRA: { bg: "rgba(207,250,254,.92)", color: "#155e75" },
};

const PALETTES: [string, string, string][] = [
  ["#4a6b5a", "#1a2b22", "#2e4d3a"],
  ["#6b5a4a", "#2b1e14", "#4d3c2a"],
  ["#5a6b4a", "#1e2b14", "#3a4d2e"],
  ["#7a6a4a", "#2b2414", "#5a4e2a"],
];

function palettePT(slug: string): [string, string, string] {
  const hash = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTES[hash % PALETTES.length];
}

function metadado(p: PontoTuristicoHome): string | null {
  if (p.categoria === "TRILHA") {
    if (p.dificuldade === "FACIL") return "Fácil";
    if (p.dificuldade === "MODERADA") return "Moderada";
    if (p.dificuldade === "DIFICIL") return "Difícil";
    if (p.distanciaKm) return `${p.distanciaKm} km`;
    return null;
  }
  if (p.categoria === "MIRANTE" && p.altitudeM) {
    return `${p.altitudeM.toLocaleString("pt-BR")} m`;
  }
  return null;
}

interface Props {
  pontos: PontoTuristicoHome[];
}

export function PontosTuristicos({ pontos }: Props) {
  if (pontos.length === 0) return null;

  return (
    <div style={{ background: "var(--sand-1)", paddingTop: 10, paddingBottom: 28 }}>
      <div
        className="home-px"
        style={{
          paddingTop: 10,
          paddingBottom: 14,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h2
          className="serif"
          style={{
            margin: 0,
            fontSize: 21,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
          }}
        >
          Explorar <em style={{ color: "var(--terra)" }}>SBS</em>
        </h2>
        <Link
          href="/pontos-turisticos"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--terra)",
            textDecoration: "none",
          }}
        >
          Ver todos →
        </Link>
      </div>

      <div className="home-px">
        <div className="h-scroll no-scrollbar">
          {pontos.map((p) => {
            const badge =
              CATEGORIA_BADGE[p.categoria] ?? {
                bg: "rgba(245,240,232,.92)",
                color: "#4a3c2a",
              };
            const meta = metadado(p);
            return (
              <Link
                key={p.slug}
                href={`/pontos-turisticos/${p.slug}`}
                className="press"
                style={{
                  width: 158,
                  borderRadius: 20,
                  overflow: "hidden",
                  position: "relative",
                  aspectRatio: "3/4",
                  display: "block",
                  textDecoration: "none",
                }}
              >
                {p.foto ? (
                  <div style={{ position: "absolute", inset: 0 }}>
                    <Image
                      src={p.foto}
                      alt={p.nome}
                      fill
                      className="object-cover"
                      sizes="158px"
                    />
                  </div>
                ) : (
                  <div style={{ position: "absolute", inset: 0 }}>
                    <PhotoPH
                      palette={palettePT(p.slug)}
                      label={p.nome}
                      ratio="auto"
                    />
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(20,12,5,.05) 0%, rgba(20,12,5,.72) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    background: badge.bg,
                    color: badge.color,
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".02em",
                  }}
                >
                  {CATEGORIA_LABEL[p.categoria] ?? p.categoria}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 12,
                    color: "#F8F2E6",
                  }}
                >
                  <div
                    className="serif"
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      letterSpacing: "-.01em",
                      lineHeight: 1.2,
                      textShadow: "0 2px 8px rgba(0,0,0,.5)",
                    }}
                  >
                    {p.nome}
                  </div>
                  {meta && (
                    <div
                      style={{
                        marginTop: 6,
                        display: "inline-block",
                        background: "rgba(245,240,232,.18)",
                        backdropFilter: "blur(4px)",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        opacity: 0.9,
                      }}
                    >
                      {meta}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
          <div className="h-scroll-spacer" style={{ width: 4, flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}
