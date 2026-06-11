import Link from "next/link";
import Image from "next/image";
import { IconPin, IconCalendar } from "./icons";
import { PhotoPH } from "./photo-ph";
import type { EventoHome } from "@/app/(public)/home-client";

const PALETTES: [string, string, string][] = [
  ["#7a4a22", "#2a1a08", "#4d2c12"],
  ["#8b6238", "#2a1a0c", "#5e3e1f"],
  ["#a06840", "#3a2010", "#6e4422"],
  ["#6b4a30", "#241808", "#4a3018"],
  ["#5a7040", "#1e2a10", "#3c5028"],
  ["#7a5a38", "#2a1e0c", "#523c22"],
];

function palette(id: string): [string, string, string] {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTES[hash % PALETTES.length];
}

interface Props {
  eventos: EventoHome[];
}

export function Events({ eventos }: Props) {
  if (eventos.length === 0) return null;

  return (
    <>
      <div style={{ background: "var(--sand-2)", paddingTop: 10, paddingBottom: 26 }}>
        <div className="home-px" style={{ paddingTop: 10, paddingBottom: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 21, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Acontece em <em style={{ color: "var(--terra)" }}>SBS</em>
          </h2>
          <Link
            href="/eventos"
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
            {eventos.map((e) => (
              <Link
                key={e.id}
                href={`/vitrine/${e.comercioSlug}?src=home_eventos`}
                className="press shadow-card"
                style={{
                  width: 280,
                  borderRadius: 24,
                  overflow: "hidden",
                  position: "relative",
                  cursor: "pointer",
                  display: "block",
                  textDecoration: "none",
                  flexShrink: 0,
                  aspectRatio: "4/3",
                }}
              >
                {e.imagem ? (
                  <div style={{ position: "absolute", inset: 0 }}>
                    <Image src={e.imagem} alt={`${e.titulo} — evento em São Bento do Sapucaí`} fill className="object-cover" sizes="280px" />
                  </div>
                ) : (
                  <div style={{ position: "absolute", inset: 0 }}>
                    <PhotoPH palette={palette(e.id)} label={e.titulo} ratio="auto" />
                  </div>
                )}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, rgba(20,12,5,.05) 0%, rgba(20,12,5,.7) 100%)",
                }} />
                <div style={{
                  position: "absolute", top: 14, left: 14,
                  background: "var(--amber)", color: "#2C2416",
                  padding: "5px 12px", borderRadius: 999,
                  fontSize: 11, fontWeight: 700, letterSpacing: ".02em",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  <IconCalendar width="11" height="11" />
                  {e.dataStr}
                </div>
                <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, color: "#F8F2E6" }}>
                  <div className="serif" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,.4)" }}>
                    {e.titulo}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
                    {e.local ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, opacity: .92 }}>
                        <IconPin width="12" height="12" />
                        {e.local}
                      </div>
                    ) : (
                      <div />
                    )}
                    <div style={{
                      background: "rgba(245,240,232,.92)",
                      color: e.preco === null ? "#4a5d3a" : "var(--terra)",
                      padding: "4px 10px", borderRadius: 999,
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {e.preco === null ? "Gratuito" : `R$ ${e.preco.toFixed(2).replace(".", ",")}`}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            <div className="h-scroll-spacer" style={{ width: 4, flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </>
  );
}
