"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  slug: string;
  contagem: number;
  subtotal: number;
}

// Barra fixa do carrinho no cardápio — leva ao checkout. Só renderizada quando
// o pedido está ativo e há itens (o BottomNav fica oculto no cardápio).
export function CartBar({ slug, contagem, subtotal }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        href={`/vitrine/${slug}/cardapio/checkout`}
        className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-stone-900 px-5 py-3.5 text-white shadow-lg shadow-black/25 transition-colors active:bg-black"
      >
        <span className="flex items-center gap-2.5 font-semibold">
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold tabular-nums">
              {contagem}
            </span>
          </span>
          Ver carrinho
        </span>
        <span className="font-bold tabular-nums">{formatBRL(subtotal)}</span>
      </Link>
    </div>
  );
}
