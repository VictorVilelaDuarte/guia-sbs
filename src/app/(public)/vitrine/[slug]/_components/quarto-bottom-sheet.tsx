/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, Users, BedDouble, Ruler, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackCtx } from "@/lib/analytics/track";
import { agruparComodidades } from "@/lib/hospedagem";
import { ComodidadeIcon } from "@/components/comerciante/hospedagem/comodidade-icons";

export interface QuartoSheetData {
  id: string;
  nome: string;
  descricao: string | null;
  precoNoite: number | null;
  capacidade: number | null;
  camas: string | null;
  tamanhoM2: number | null;
  comodidades: string[];
  fotos: string[];
}

interface Props {
  quarto: QuartoSheetData | null;
  whatsappUrl: ((q: QuartoSheetData) => string) | null;
  onClose: () => void;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function QuartoBottomSheet({ quarto, whatsappUrl, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [displayed, setDisplayed] = useState<QuartoSheetData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const carouselTouchStartX = useRef(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (quarto) {
      setDisplayed(quarto);
      setCarouselIndex(0);
      trackCtx("item_view", { meta: { itemId: quarto.id, titulo: quarto.nome } });
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setIsVisible(false);
      const t = setTimeout(() => setDisplayed(null), 400);
      return () => clearTimeout(t);
    }
  }, [quarto]);

  // Scroll lock (mesmo fix do produto-bottom-sheet para iOS Safari)
  useEffect(() => {
    if (!isVisible) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, onClose]);

  function onHandleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }
  function onHandleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragOffset(Math.min(delta, 320));
  }
  function onHandleTouchEnd() {
    isDragging.current = false;
    if (dragOffset > 80) onClose();
    setDragOffset(0);
  }
  function onCarouselTouchStart(e: React.TouchEvent) {
    carouselTouchStartX.current = e.touches[0].clientX;
  }
  function onCarouselTouchEnd(e: React.TouchEvent) {
    if (!displayed) return;
    const delta = e.changedTouches[0].clientX - carouselTouchStartX.current;
    const count = displayed.fotos.length;
    if (delta < -40 && carouselIndex < count - 1) setCarouselIndex((i) => i + 1);
    if (delta > 40 && carouselIndex > 0) setCarouselIndex((i) => i - 1);
  }

  const portalRoot =
    typeof document !== "undefined"
      ? (document.getElementById("portal-root") ?? document.body)
      : null;

  if (!mounted || !displayed || !portalRoot) return null;

  const { nome, descricao, precoNoite, capacidade, camas, tamanhoM2, comodidades, fotos } = displayed;
  const temMultiImagens = fotos.length > 1;
  const grupos = agruparComodidades(comodidades);
  const waHref = whatsappUrl ? whatsappUrl(displayed) : null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }} aria-modal="true" role="dialog">
      <div
        className={cn("absolute inset-0 bg-black/60 transition-opacity duration-300", isVisible ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute left-0 right-0 bottom-0 flex flex-col rounded-t-3xl overflow-hidden bg-white",
          "max-h-[96svh] transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          isVisible ? "translate-y-0" : "translate-y-full",
        )}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: "none" } : undefined}
      >
        <div
          className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-stone-200" />
        </div>

        {/* Carrossel */}
        <div
          className="relative w-full shrink-0 overflow-hidden bg-stone-100"
          style={{ aspectRatio: "4/3" }}
          onTouchStart={onCarouselTouchStart}
          onTouchEnd={onCarouselTouchEnd}
        >
          {fotos.length > 0 ? (
            <>
              {fotos.map((url, i) => (
                <div key={i} className="absolute inset-0 transition-transform duration-300 ease-out" style={{ transform: `translateX(${(i - carouselIndex) * 100}%)` }}>
                  <Image src={url} alt={`${nome} — foto ${i + 1}`} fill sizes="100vw" className="object-cover" priority={i === 0} />
                </div>
              ))}
              {carouselIndex > 0 && (
                <button onClick={() => setCarouselIndex((i) => i - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60" aria-label="Foto anterior">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {carouselIndex < fotos.length - 1 && (
                <button onClick={() => setCarouselIndex((i) => i + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60" aria-label="Próxima foto">
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              {temMultiImagens && (
                <div className="absolute bottom-3 right-3 bg-black/40 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {carouselIndex + 1} / {fotos.length}
                </div>
              )}
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-stone-100">
              <span className="font-serif text-5xl text-stone-300">{nome[0]}</span>
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto overscroll-y-contain flex-1 px-5 pt-4 pb-6">
          <h2 className="font-serif text-3xl font-bold text-stone-900 leading-tight mb-2">{nome}</h2>

          {/* Chips de capacidade/camas/m² */}
          <div className="flex items-center gap-3 flex-wrap text-sm text-stone-500 mb-3">
            {capacidade != null && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{capacidade} hóspede{capacidade !== 1 ? "s" : ""}</span>}
            {camas && <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" />{camas}</span>}
            {tamanhoM2 != null && <span className="inline-flex items-center gap-1"><Ruler className="h-4 w-4" />{tamanhoM2} m²</span>}
          </div>

          {descricao && <p className="text-sm text-stone-600 leading-relaxed mb-4">{descricao}</p>}

          {/* Comodidades do quarto */}
          {grupos.length > 0 && (
            <div className="space-y-3 mb-4">
              {grupos.map((g) => (
                <div key={g.grupo}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400 mb-1.5">{g.label}</p>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                    {g.itens.map((c) => (
                      <span key={c.key} className="inline-flex items-center gap-2 text-sm text-stone-700">
                        <ComodidadeIcon keyName={c.key} className="h-4 w-4 text-stone-400 shrink-0" />
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé fixo: preço + CTA */}
        <div className="shrink-0 border-t border-stone-100 px-5 py-3 flex items-center justify-between gap-3 bg-white">
          <div>
            {precoNoite != null ? (
              <>
                <span className="text-lg font-bold text-stone-900">{formatBRL(precoNoite)}</span>
                <span className="text-xs text-stone-500"> /noite</span>
              </>
            ) : (
              <span className="text-sm font-medium text-stone-500">Consultar valores</span>
            )}
          </div>
          {waHref && (
            <a
              href={waHref}
              data-track="click_reserva"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Consultar disponibilidade
            </a>
          )}
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
