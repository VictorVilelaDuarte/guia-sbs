"use client";

import Image from "next/image";
import { type Produto, formatBRL, isPromoAtiva } from "./types";

interface Props {
  produto: Produto & { categoriaNome?: string };
  now: number;
  onClick: () => void;
  // Unidades já escolhidas no pedido (pedido pela mesa) — mostra um selo.
  noPedido?: number;
}

export function ItemRow({ produto, now, onClick, noPedido = 0 }: Props) {
  const promoAtiva = isPromoAtiva(produto.precoPromo, produto.promoFim, now);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-4 w-full text-left hover:bg-stone-50 active:bg-stone-100 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-md font-semibold text-stone-950 leading-snug">
          {noPedido > 0 && (
            <span className="mr-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1.5 align-[2px] text-[11px] font-bold tabular-nums text-white">
              {noPedido}
            </span>
          )}
          {produto.titulo}
        </p>
        {produto.descricao && (
          <p className="text-sm text-stone-600 mt-0.5 line-clamp-3 leading-relaxed">
            {produto.descricao}
          </p>
        )}
        <div className="mt-1.5">
          {produto.variacoes.length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {produto.variacoes.map((v) => (
                <span key={v.id} className="text-xs text-stone-500">
                  {v.nome}{" "}
                  <span className="font-bold text-stone-800">
                    {formatBRL(v.preco)}
                  </span>
                </span>
              ))}
            </div>
          ) : produto.preco != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-stone-900">
                {formatBRL(promoAtiva ? produto.precoPromo! : produto.preco)}
              </span>
              {promoAtiva && (
                <span className="text-xs text-stone-400 line-through">
                  {formatBRL(produto.preco)}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {produto.imagens[0] && (
        <div className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-stone-100">
          <Image
            src={produto.imagens[0]}
            alt={produto.titulo}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
      )}
    </button>
  );
}
