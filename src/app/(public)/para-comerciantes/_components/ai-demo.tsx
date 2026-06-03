"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, Star } from "lucide-react";

const QUERIES_DATA = [
  {
    q: "onde comer lanche agora?",
    results: [
      {
        nome: "Lanchonete da Serra",
        categoria: "Lanches · Salgados",
        rating: 4.8,
        cor: "#8c6240",
      },
      {
        nome: "Café Mantiqueira",
        categoria: "Café · Sanduíches",
        rating: 4.7,
        cor: "#5a7a4a",
      },
      {
        nome: "Hamburgueria do Baú",
        categoria: "Hambúrguer · Batata frita",
        rating: 4.9,
        cor: "#a05030",
      },
    ],
  },
  {
    q: "onde ficar perto do centro?",
    results: [
      {
        nome: "Pousada Vale da Névoa",
        categoria: "Hospedagem · Café incluso",
        rating: 4.9,
        cor: "#4a6880",
      },
      {
        nome: "Casa da Serra B&B",
        categoria: "Hospedagem · Centro",
        rating: 4.7,
        cor: "#5a4870",
      },
      {
        nome: "Chalé dos Pinheiros",
        categoria: "Hospedagem · Vista vale",
        rating: 4.6,
        cor: "#405060",
      },
    ],
  },
];

export function AiDemo() {
  const [queryIndex, setQueryIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [phase, setPhase] = useState<"typing" | "loading" | "results">(
    "typing",
  );
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    // Função declarada (não const) — hoisting permite a chamada recursiva sem TDZ
    function animate(qIdx: number) {
      const { q, results } = QUERIES_DATA[qIdx];

      setQueryIndex(qIdx);
      setTypedText("");
      setPhase("typing");
      setVisibleCount(0);

      let i = 0;
      const typer = setInterval(() => {
        i++;
        setTypedText(q.slice(0, i));
        if (i >= q.length) {
          clearInterval(typer);
          setTimeout(() => {
            setPhase("loading");
            setTimeout(() => {
              setPhase("results");
              let r = 0;
              const shower = setInterval(() => {
                r++;
                setVisibleCount(r);
                if (r >= results.length) {
                  clearInterval(shower);
                  const next = (qIdx + 1) % QUERIES_DATA.length;
                  setTimeout(() => animate(next), 4500);
                }
              }, 280);
            }, 1700);
          }, 500);
        }
      }, 58);
    }

    animate(0);
  }, []);

  const current = QUERIES_DATA[queryIndex];

  return (
    <>
      <style>{`
        @keyframes ai-blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ai-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes ai-slide  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        style={{
          maxWidth: 320,
          margin: "0 auto",
          background: "#16100a",
          borderRadius: 28,
          padding: "20px 16px 24px",
          boxShadow:
            "0 40px 100px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.07)",
        }}
      >
        {/* Barra decorativa de "app" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
            padding: "0 2px",
          }}
        >
          {[1, 2, 3].map((k) => (
            <span
              key={k}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "rgba(255,255,255,.12)",
              }}
            />
          ))}
          <div
            style={{
              flex: 1,
              height: 5,
              background: "rgba(255,255,255,.07)",
              borderRadius: 999,
              marginLeft: 4,
            }}
          />
        </div>

        {/* Campo de busca */}
        <div
          style={{
            background: "rgba(255,255,255,.07)",
            borderRadius: 14,
            padding: "11px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "1px solid rgba(255,255,255,.1)",
            marginBottom: 14,
          }}
        >
          <Search
            size={14}
            style={{ color: "rgba(245,240,232,.35)", flexShrink: 0 }}
          />
          <span
            style={{
              color: "#F5F0E8",
              fontSize: 13.5,
              flex: 1,
              minHeight: 20,
              lineHeight: "20px",
            }}
          >
            {typedText}
            {phase === "typing" && (
              <span
                style={{
                  display: "inline-block",
                  width: 1.5,
                  height: 14,
                  background: "#C4873A",
                  marginLeft: 1,
                  verticalAlign: "middle",
                  animation: "ai-blink 0.9s step-end infinite",
                }}
              />
            )}
          </span>
          <div
            style={{
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
            }}
          >
            <Sparkles size={9} />
            IA
          </div>
        </div>

        {/* Área dinâmica — minHeight fixo evita layout shift entre fases e queries */}
        <div style={{ minHeight: 238 }}>
          {/* Loading */}
          {phase === "loading" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 4px",
                color: "rgba(245,240,232,.4)",
                fontSize: 12.5,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#C4873A",
                      display: "inline-block",
                      animation: `ai-bounce 1.2s ${i * 0.18}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
              Buscando com IA...
            </div>
          )}

          {/* Resultados */}
          {phase === "results" && (
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "rgba(245,240,232,.35)",
                  marginBottom: 10,
                  paddingLeft: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Sparkles size={9} style={{ color: "#C4873A" }} />
                {current.results.length} resultados encontrados
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {current.results.slice(0, visibleCount).map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,.05)",
                      borderRadius: 13,
                      padding: "11px 13px",
                      border: "1px solid rgba(255,255,255,.07)",
                      display: "flex",
                      gap: 11,
                      alignItems: "center",
                      animation: "ai-slide 0.3s ease forwards",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: `linear-gradient(140deg, ${r.cor}, #16100a)`,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "#F5F0E8",
                          fontSize: 12.5,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.nome}
                      </div>
                      <div
                        style={{
                          color: "rgba(245,240,232,.4)",
                          fontSize: 10.5,
                          marginTop: 2,
                        }}
                      >
                        {r.categoria}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 5,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#4ade80",
                            display: "block",
                          }}
                        />
                        <span style={{ color: "#4ade80", fontWeight: 600 }}>
                          Aberto
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          color: "#C4873A",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        <Star size={9} fill="currentColor" />
                        {r.rating}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* fim área dinâmica */}
      </div>
    </>
  );
}
