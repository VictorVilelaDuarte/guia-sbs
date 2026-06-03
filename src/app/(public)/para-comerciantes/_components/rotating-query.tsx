"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles } from "lucide-react";

const QUERIES = [
  "onde como um lanche agora?",
  "trilha fácil para fazer com crianças",
  "pousada com café da manhã incluído",
  "onde comprar artesanato em SBS?",
  "restaurante aberto no domingo à noite",
];

export function RotatingQuery() {
  const [index, setIndex]   = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex(i => (i + 1) % QUERIES.length);
        setFading(false);
      }, 300);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background: "rgba(255,255,255,.07)",
      borderRadius: 16,
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      border: "1px solid rgba(255,255,255,.11)",
      maxWidth: 400,
    }}>
      <Search size={15} style={{ color: "rgba(245,240,232,.3)", flexShrink: 0 }} />
      <span style={{
        color: "#F5F0E8",
        fontSize: 14,
        flex: 1,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.28s ease",
        lineHeight: "20px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {QUERIES[index]}
      </span>
      <div style={{
        background: "linear-gradient(135deg, #C4873A, #8B4513)",
        borderRadius: 8,
        padding: "4px 9px",
        fontSize: 9.5,
        fontWeight: 700,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 3,
        flexShrink: 0,
        letterSpacing: ".03em",
      }}>
        <Sparkles size={9} />
        IA
      </div>
    </div>
  );
}
