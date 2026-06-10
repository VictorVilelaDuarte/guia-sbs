"use client";

import { useRouter } from "next/navigation";

// Atalhos de busca por IA — cada chip pré-preenche a query e dispara a busca.
// Tornam a feature tangível e ensinam o tipo de pergunta que ela entende.
const CHIPS = [
  { emoji: "🍔", label: "onde comer?", q: "onde comer?" },
  { emoji: "🛏️", label: "onde me hospedar?", q: "onde me hospedar?" },
  { emoji: "🥾", label: "o que fazer hoje?", q: "o que fazer hoje?" },
];

export function SearchChips() {
  const router = useRouter();

  return (
    <div
      className="home-px"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        paddingTop: 14,
        paddingBottom: 4,
      }}
    >
      {CHIPS.map((c) => (
        <button
          key={c.q}
          className="press"
          onClick={() => router.push(`/busca?q=${encodeURIComponent(c.q)}`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--sand-2)",
            border: "1px solid rgba(60,40,20,.10)",
            color: "var(--ink)",
            padding: "8px 14px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(60,40,20,.06)",
          }}
        >
          <span style={{ fontSize: 14 }}>{c.emoji}</span>
          {c.label}
        </button>
      ))}
    </div>
  );
}
