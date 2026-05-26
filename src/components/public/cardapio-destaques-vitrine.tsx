"use client";

import { useState } from "react";
import { DestaqueCard } from "./cardapio/destaque-card";
import { ProdutoBottomSheet, type ProdutoSheet } from "./cardapio/produto-bottom-sheet";
import type { Produto } from "./cardapio/types";

type ProdutoDestaque = Produto & { categoriaNome: string };

interface Props {
  produtos: ProdutoDestaque[];
  now: number;
}

export function CardapioDestaquesVitrine({ produtos, now }: Props) {
  const [selected, setSelected] = useState<ProdutoSheet | null>(null);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
        {produtos.map((p) => (
          <DestaqueCard
            key={p.id}
            produto={p}
            now={now}
            onClick={() => setSelected({ ...p, categoriaNome: p.categoriaNome })}
          />
        ))}
      </div>
      <ProdutoBottomSheet
        produto={selected}
        now={now}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
