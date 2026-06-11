import Link from "next/link";
import Image from "next/image";
import { IconStar, IconPin } from "./icons";
import { PhotoPH } from "./photo-ph";
import type { ComercioDestaque } from "@/app/(public)/home-client";

const CATEGORIA_LABEL: Record<string, string> = {
  ALIMENTACAO: "Alimentação",
  HOSPEDAGEM: "Hospedagem",
  TURISMO: "Turismo",
  SERVICO: "Serviços",
  COMERCIO: "Comércio",
  ENTRETENIMENTO: "Entretenimento",
};

const PALETTES: [string, string, string][] = [
  ["#a06440", "#3d2616", "#6b3a1d"],
  ["#c4873a", "#5b3a1a", "#8b5a2a"],
  ["#8a7c5a", "#3a2c14", "#6b5634"],
  ["#9c5a30", "#3a200e", "#7a4220"],
  ["#6b8550", "#2a3818", "#4d6038"],
  ["#5a7a8a", "#1a2c3a", "#3a5a68"],
];

function palette(slug: string): [string, string, string] {
  const hash = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTES[hash % PALETTES.length];
}

interface Props {
  items: ComercioDestaque[];
}

export function Featured({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="home-px" style={{ background: "var(--sand-2)", paddingTop: 12, paddingBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <IconStar width="20" height="20" style={{ color: "var(--amber)" } as React.CSSProperties} />
        <h2 className="serif" style={{ margin: 0, fontSize: 21, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Em destaque
        </h2>
      </div>
      <div className="featured-list">
        {items.map((it) => {
          const coverUrl = it.foto ?? it.logo;
          return (
            <Link
              key={it.slug}
              href={`/vitrine/${it.slug}?src=home_destaque`}
              className="press shadow-card"
              style={{
                background: "#FBF7EE",
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(212,201,176,.5)",
                cursor: "pointer",
                textDecoration: "none",
                display: "block",
              }}
            >
              <div style={{ position: "relative" }}>
                {coverUrl ? (
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
                    <Image src={coverUrl} alt={`${it.nome} em São Bento do Sapucaí`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 560px" />
                  </div>
                ) : (
                  <PhotoPH palette={palette(it.slug)} label={it.slug} ratio="16/9" />
                )}
                <div style={{
                  position: "absolute", top: 12, left: 12,
                  background: "rgba(245,240,232,.95)", color: "var(--terra)",
                  padding: "5px 11px 5px 9px", borderRadius: 999,
                  fontSize: 11, fontWeight: 700,
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}>
                  <IconStar width="11" height="11" style={{ color: "var(--amber)" } as React.CSSProperties} />
                  Destaque
                </div>
              </div>
              <div style={{ padding: "14px 16px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.01em", lineHeight: 1.15 }}>
                      {it.nome}
                    </div>
                    <div style={{ color: "var(--ink-2)", fontSize: 12, marginTop: 3 }}>
                      {CATEGORIA_LABEL[it.categorias[0]] ?? it.categorias[0]}
                    </div>
                  </div>
                  <div style={{
                    background: it.aberto ? "#dfe7d4" : "#f0e8e0",
                    color: it.aberto ? "#4a5d3a" : "var(--terra)",
                    padding: "4px 10px", borderRadius: 999,
                    fontSize: 10.5, fontWeight: 700, flexShrink: 0,
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}>
                    {it.aberto && (
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: "#6b8550" }} />
                    )}
                    {it.aberto ? "Aberto" : "Fechado"}
                  </div>
                </div>
                {it.bairro && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 11.5, marginTop: 10 }}>
                    <IconPin width="12" height="12" />
                    {it.bairro}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
