"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PhotoPH } from "./photo-ph";

const CATEGORIA_LABEL: Record<string, string> = {
  ALIMENTACAO: "Alimentação",
  HOSPEDAGEM: "Hospedagem",
  TURISMO: "Turismo",
  SERVICO: "Serviço",
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

interface ComercioAberto {
  slug: string;
  nome: string;
  logo: string | null;
  categorias: string[];
  fechaLabel: string;
}

export function OpenNow({ items }: { items: ComercioAberto[] }) {
  const [nowStr, setNowStr] = useState("");

  useEffect(() => {
    const update = () =>
      setNowStr(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      style={{ background: "var(--sand-2)", paddingTop: 10, paddingBottom: 22 }}
    >
      <div
        className="home-px"
        style={{
          paddingTop: 10,
          paddingBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pulse-wrap">
            <span className="pulse-ring" />
            <span className="pulse-dot" />
          </span>
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
            Aberto agora
          </h2>
        </div>
        {nowStr && (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{nowStr}</span>
        )}
      </div>

      <div
        className="h-scroll no-scrollbar"
        style={{ margin: 0, paddingLeft: 20, paddingRight: 20, scrollPaddingInlineStart: 20 }}
      >
          {items.map((it) => (
            <Link
              key={it.slug}
              href={`/vitrine/${it.slug}`}
              className="press shadow-card"
              style={{
                width: 248,
                background: "#FBF7EE",
                borderRadius: 22,
                overflow: "hidden",
                cursor: "pointer",
                border: "1px solid rgba(212,201,176,.5)",
                display: "block",
                textDecoration: "none",
              }}
            >
              {/* Foto */}
              <div style={{ position: "relative" }}>
                {it.logo ? (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "5/3",
                      overflow: "hidden",
                      background: "#e8ddc8",
                    }}
                  >
                    <Image
                      src={it.logo}
                      alt={it.nome}
                      fill
                      className="object-cover"
                      sizes="248px"
                    />
                  </div>
                ) : (
                  <PhotoPH
                    palette={palette(it.slug)}
                    label={it.slug}
                    ratio="5/3"
                  />
                )}

                {/* Badge aberto */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    background: "#dfe7d4",
                    color: "#4a5d3a",
                    padding: "5px 10px",
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    border: "1px solid rgba(120,140,100,.25)",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: "#6b8550",
                    }}
                  />
                  {it.fechaLabel}
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: "12px 14px 14px" }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--ink)",
                    fontSize: 14.5,
                    lineHeight: 1.2,
                  }}
                >
                  {it.nome}
                </div>
                <div
                  style={{
                    color: "var(--ink-2)",
                    fontSize: 11.5,
                    marginTop: 3,
                  }}
                >
                  {CATEGORIA_LABEL[it.categorias[0]] ?? it.categorias[0]}
                </div>
              </div>
            </Link>
          ))}
          <div
            className="h-scroll-spacer"
            style={{ width: 4, flexShrink: 0 }}
          />
      </div>
    </div>
  );
}
