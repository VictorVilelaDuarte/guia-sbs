import Link from "next/link";
import { Sparkles, Search, Store, Map } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Busca · Guia SBS",
};

// Página provisória da busca inteligente. A UI de entrada (barra + chips na
// home) já aponta para cá; o motor de ranqueamento por IA será implementado em
// fases (ver docs/busca-inteligente.md). Até lá, exibimos a query e oferecemos
// caminhos de navegação para o visitante não ficar sem saída.
export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = q?.trim() ?? "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--sand-1)",
        padding: "32px 22px 120px",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      {/* Selo da feature */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "linear-gradient(135deg, #C4873A, #8B4513)",
          color: "#fff",
          padding: "5px 12px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".03em",
          marginBottom: 18,
        }}
      >
        <Sparkles size={12} />
        Busca com IA
      </div>

      {/* Query buscada */}
      {termo && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--sand-2)",
            border: "1px solid rgba(60,40,20,.10)",
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 24,
          }}
        >
          <Search
            size={18}
            style={{ color: "var(--terra)", flexShrink: 0 }}
          />
          <span
            style={{ fontSize: 15, color: "var(--ink)", fontWeight: 500 }}
          >
            {termo}
          </span>
        </div>
      )}

      {/* Estado provisório — em construção */}
      <h1
        className="serif"
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.02em",
          margin: "0 0 8px",
        }}
      >
        Nossa busca inteligente está chegando ✨
      </h1>
      <p
        style={{
          fontSize: 14.5,
          lineHeight: 1.5,
          color: "var(--muted)",
          margin: "0 0 28px",
        }}
      >
        Em breve você vai poder perguntar do seu jeito e a IA encontra os
        melhores lugares de São Bento pra você. Enquanto isso, explore o guia:
      </p>

      {/* Caminhos de fallback */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link
          href="/comercios"
          className="press"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--sand-2)",
            border: "1px solid rgba(60,40,20,.10)",
            borderRadius: 16,
            padding: "16px 18px",
            textDecoration: "none",
            color: "var(--ink)",
            boxShadow: "0 1px 3px rgba(60,40,20,.06)",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "linear-gradient(140deg, #C4873A, #8B4513)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <Store size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              Explorar comércios
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Filtre por categoria e veja o que está aberto
            </div>
          </div>
        </Link>

        <Link
          href="/mapa"
          className="press"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--sand-2)",
            border: "1px solid rgba(60,40,20,.10)",
            borderRadius: 16,
            padding: "16px 18px",
            textDecoration: "none",
            color: "var(--ink)",
            boxShadow: "0 1px 3px rgba(60,40,20,.06)",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "linear-gradient(140deg, #5a7a4a, #2e4d3a)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <Map size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Ver no mapa</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Comércios e pontos turísticos da cidade
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
