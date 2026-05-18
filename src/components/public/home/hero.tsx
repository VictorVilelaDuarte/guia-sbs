"use client";

import { useState, useEffect } from "react";
import { IconSearch } from "./icons";
import { HeroIllustration } from "./hero-illustration";
import { HeroBottomCurve } from "./waves";

interface HeroProps {
  query: string;
  setQuery: (v: string) => void;
  focused: boolean;
  setFocused: (v: boolean) => void;
}

const PLACEHOLDERS = [
  "Buscar restaurantes, pousada, passeio…",
  "Pedra do Baú, trilhas, mirantes…",
  "Café da manhã, truta, pinhão…",
];

export function Hero({ query, setQuery, focused, setFocused }: HeroProps) {
  const [phIdx, setPhIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length),
      3800,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="home-hero"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#3a2615",
      }}
    >
      <HeroIllustration />
      <div className="grain" />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 24,
          bottom: 200,
          zIndex: 2,
          padding: "0 22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: 6,
            background: "rgba(245,240,232,.18)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(245,240,232,.28)",
            color: "#F5F0E8",
            padding: "5px 11px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: ".04em",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "#E8A855",
            }}
          />
          São Bento do Sapucaí · SP
        </div>
        <h1
          className="serif home-hero-title"
          style={{
            margin: 0,
            color: "#F8F2E6",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            textShadow: "0 2px 16px rgba(20,12,5,.45)",
          }}
        >
          Descubra{" "}
          <span
            style={{ fontStyle: "italic", fontWeight: 500, color: "#F0D9B0" }}
          >
            São Bento
          </span>{" "}
          do Sapucaí
        </h1>
        <p
          className="home-hero-desc"
          style={{
            margin: "8px 0 0",
            color: "#EDE0C8",
            lineHeight: 1.4,
            textShadow: "0 1px 6px rgba(20,12,5,.5)",
          }}
        >
          Gastronomia, hospedagem e experiências na Serra da Mantiqueira.
        </p>
      </div>

      <HeroBottomCurve color="var(--sand-1)" />

      <div
        style={{
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 30,
          zIndex: 5,
          maxWidth: 600,
          margin: "auto",
        }}
      >
        <div
          style={{
            background: focused
              ? "rgba(255,255,255,0.18)"
              : "rgba(255,255,255,0.11)",
            backdropFilter: "blur(28px) saturate(1.8) brightness(1.08)",
            WebkitBackdropFilter: "blur(28px) saturate(1.8) brightness(1.08)",
            border: focused
              ? "1px solid rgba(255,255,255,0.55)"
              : "1px solid rgba(255,255,255,0.22)",
            borderRadius: 999,
            padding: "11px 16px 11px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "background .25s, border-color .25s",
            boxShadow: [
              "inset 0 1px 0 rgba(255,255,255,0.35)",
              "inset 0 -1px 0 rgba(0,0,0,0.08)",
              "0 8px 32px -10px rgba(0,0,0,0.45)",
            ].join(", "),
          }}
        >
          <IconSearch
            width="18"
            height="18"
            style={
              {
                color: "rgba(245,240,232,0.8)",
                flexShrink: 0,
              } as React.CSSProperties
            }
          />
          <input
            className="glass-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={PLACEHOLDERS[phIdx]}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontFamily: "inherit",
              fontSize: 13.5,
              color: "#F5F0E8",
              background: "transparent",
              minWidth: 0,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "rgba(245,240,232,0.9)",
                width: 22,
                height: 22,
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 14,
                display: "grid",
                placeItems: "center",
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
