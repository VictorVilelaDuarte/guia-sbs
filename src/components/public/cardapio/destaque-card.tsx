"use client";

import Image from "next/image";
import { type Produto, formatBRL, isPromoAtiva } from "./types";

const DIAMOND = "✦";

interface Props {
  produto: Produto & { categoriaNome: string };
  now: number;
  onClick: () => void;
}

export function DestaqueCard({ produto, now, onClick }: Props) {
  const promoAtiva = isPromoAtiva(produto.precoPromo, produto.promoFim, now);
  const precoBase = produto.preco ?? produto.variacoes[0]?.preco ?? null;
  const precoExibido = promoAtiva ? produto.precoPromo! : precoBase;

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 w-44 rounded-2xl overflow-hidden bg-white shadow-sm text-left active:scale-[0.97] flex flex-col justify-between transition-transform"
    >
      <div className="relative h-36 w-full bg-stone-100">
        {produto.imagens[0] && (
          <Image
            src={produto.imagens[0]}
            alt={produto.titulo}
            fill
            sizes="176px"
            className="object-cover"
          />
        )}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-white/90 backdrop-blur-sm text-stone-700 px-2 py-0.5 rounded-full border border-stone-200">
            {DIAMOND} {produto.categoriaNome}
          </span>
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <p className="text-sm font-semibold text-stone-900 leading-snug">
          {produto.titulo}
        </p>
        {produto.descricao && (
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-2 italic">
            {produto.descricao}
          </p>
        )}
        {precoExibido != null && (
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-stone-900">
              {formatBRL(precoExibido)}
            </span>
            {promoAtiva && precoBase != null && precoBase !== precoExibido && (
              <span className="text-xs text-stone-400 line-through">
                {formatBRL(precoBase)}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
