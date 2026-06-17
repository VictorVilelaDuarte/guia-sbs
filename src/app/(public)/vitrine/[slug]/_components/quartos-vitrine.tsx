"use client";

import { useState } from "react";
import Image from "next/image";
import { Users, BedDouble, Ruler, MessageCircle } from "lucide-react";
import { ComodidadeIcon } from "@/components/comerciante/hospedagem/comodidade-icons";
import { comodidadeLabel } from "@/lib/hospedagem";
import { QuartoBottomSheet, type QuartoSheetData } from "./quarto-bottom-sheet";

interface Props {
  quartos: QuartoSheetData[];
  whatsapp: string | null;
  comercioNome: string;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function QuartosVitrine({ quartos, whatsapp, comercioNome }: Props) {
  const [selecionado, setSelecionado] = useState<QuartoSheetData | null>(null);

  const whatsappUrl = whatsapp
    ? (q: QuartoSheetData) => {
        const num = whatsapp.replace(/\D/g, "");
        const msg = `Olá! Tenho interesse no quarto *${q.nome}* na *${comercioNome}*. A diária está disponível?`;
        return `https://wa.me/55${num}?text=${encodeURIComponent(msg)}`;
      }
    : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {quartos.map((q) => (
          <div
            key={q.id}
            onClick={() => setSelecionado(q)}
            className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-border shadow-soft cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="relative w-full bg-stone-100" style={{ aspectRatio: "4/3" }}>
              {q.fotos[0] ? (
                <Image src={q.fotos[0]} alt={q.nome} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <BedDouble className="h-9 w-9 text-stone-300" />
                </div>
              )}
              {q.fotos.length > 1 && (
                <span className="absolute bottom-2 right-2 bg-black/45 text-white text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {q.fotos.length} fotos
                </span>
              )}
            </div>

            <div className="p-3 flex flex-col flex-1">
              <p className="text-sm font-semibold text-foreground leading-snug">{q.nome}</p>

              <div className="flex items-center gap-2.5 flex-wrap mt-1.5 text-[11px] text-muted-foreground">
                {q.capacidade != null && <span className="inline-flex items-center gap-0.5"><Users className="h-3 w-3" />{q.capacidade}</span>}
                {q.camas && <span className="inline-flex items-center gap-0.5"><BedDouble className="h-3 w-3" />{q.camas}</span>}
                {q.tamanhoM2 != null && <span className="inline-flex items-center gap-0.5"><Ruler className="h-3 w-3" />{q.tamanhoM2} m²</span>}
              </div>

              {q.comodidades.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {q.comodidades.slice(0, 3).map((key) => (
                    <span key={key} className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                      <ComodidadeIcon keyName={key} className="h-3 w-3" />
                      {comodidadeLabel(key)}
                    </span>
                  ))}
                  {q.comodidades.length > 3 && (
                    <span className="text-[11px] text-stone-400">+{q.comodidades.length - 3}</span>
                  )}
                </div>
              )}

              <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                <div>
                  {q.precoNoite != null ? (
                    <>
                      <span className="text-xs text-stone-500">a partir de </span>
                      <span className="text-sm font-bold text-foreground">{formatBRL(q.precoNoite)}</span>
                      <span className="text-xs text-stone-500">/noite</span>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-stone-500">Consultar valores</span>
                  )}
                </div>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl(q)}
                    data-track="click_reserva"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Consultar
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <QuartoBottomSheet quarto={selecionado} whatsappUrl={whatsappUrl} onClose={() => setSelecionado(null)} />
    </>
  );
}
