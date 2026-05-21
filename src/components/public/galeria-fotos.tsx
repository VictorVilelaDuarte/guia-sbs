"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Foto {
  id: string;
  url: string;
  alt: string | null;
}

export function GaleriaFotos({
  fotos,
  nomeComercio,
}: {
  fotos: Foto[];
  nomeComercio: string;
}) {
  const [indice, setIndice] = useState<number | null>(null);

  const fechar = useCallback(() => setIndice(null), []);
  const anterior = useCallback(
    () =>
      setIndice((i) =>
        i !== null ? (i - 1 + fotos.length) % fotos.length : null,
      ),
    [fotos.length],
  );
  const proximo = useCallback(
    () => setIndice((i) => (i !== null ? (i + 1) % fotos.length : null)),
    [fotos.length],
  );

  useEffect(() => {
    if (indice === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proximo();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [indice, fechar, anterior, proximo]);

  if (fotos.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2">
        {fotos.map((foto, i) => (
          <button
            key={foto.id}
            type="button"
            onClick={() => setIndice(i)}
            className="relative h-44 w-64 shrink-0 rounded-xl overflow-hidden snap-start bg-muted cursor-zoom-in"
          >
            <Image
              src={foto.url}
              alt={foto.alt ?? nomeComercio}
              fill
              className="object-cover transition-transform duration-200 hover:scale-105"
              sizes="256px"
            />
          </button>
        ))}
      </div>

      {indice !== null && (
        <Lightbox
          key={indice}
          fotos={fotos}
          indice={indice}
          nomeComercio={nomeComercio}
          onFechar={fechar}
          onAnterior={anterior}
          onProximo={proximo}
          onSetIndice={setIndice}
        />
      )}
    </>
  );
}

function pinchDist(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function Lightbox({
  fotos,
  indice,
  nomeComercio,
  onFechar,
  onAnterior,
  onProximo,
  onSetIndice,
}: {
  fotos: Foto[];
  indice: number;
  nomeComercio: string;
  onFechar: () => void;
  onAnterior: () => void;
  onProximo: () => void;
  onSetIndice: (i: number) => void;
}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Refs espelham o state para uso em callbacks não-reativos (addEventListener)
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Listener não-passivo: impede o browser de fazer zoom de viewport no pinch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault(); // Bloqueia zoom nativo do viewport

        lastPanPos.current = null;
        const dist = pinchDist(e.touches);

        if (lastPinchDist.current !== null) {
          const next = Math.max(
            1,
            Math.min(5, scaleRef.current * (dist / lastPinchDist.current)),
          );
          scaleRef.current = next;
          setScale(next);
        }
        lastPinchDist.current = dist;
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        e.preventDefault();
        if (lastPanPos.current) {
          const dx = e.touches[0].clientX - lastPanPos.current.x;
          const dy = e.touches[0].clientY - lastPanPos.current.y;
          const next = { x: panRef.current.x + dx, y: panRef.current.y + dy };
          panRef.current = next;
          setPan(next);
        }
        lastPanPos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length >= 2) {
      lastPinchDist.current = pinchDist(e.touches as unknown as TouchList);
      swipeStart.current = null;
      lastPanPos.current = null;
    } else {
      lastPinchDist.current = null;
      lastPanPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length > 0) return; // ainda tem dedo na tela

    lastPinchDist.current = null;
    lastPanPos.current = null;

    // Snap de volta a scale=1 se próximo
    if (scaleRef.current < 1.1) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      scaleRef.current = 1;
      panRef.current = { x: 0, y: 0 };
    }

    // Swipe para navegar (só quando não está com zoom)
    if (scaleRef.current <= 1 && swipeStart.current) {
      const dx = e.changedTouches[0].clientX - swipeStart.current.x;
      const dy = Math.abs(e.changedTouches[0].clientY - swipeStart.current.y);
      if (Math.abs(dx) > 48 && Math.abs(dx) > dy) {
        if (dx > 0) onAnterior();
        else onProximo();
      }
    }
    swipeStart.current = null;
  }

  const isZoomed = scale > 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span
          className="text-sm tabular-nums"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {indice + 1} / {fotos.length}
        </span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="p-1.5 rounded-full transition-colors"
          style={{
            color: "rgba(255,255,255,0.8)",
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Imagem com transform customizado */}
      <div className="flex-1 flex items-center justify-center overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotos[indice].url}
          alt={fotos[indice].alt ?? nomeComercio}
          style={{
            maxWidth: "80vw",
            maxHeight: "80vh",
            objectFit: "contain",
            display: "block",
            transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
            transformOrigin: "center",
            transition: isZoomed ? "none" : "transform 0.2s ease",
            userSelect: "none",
            touchAction: "none",
            willChange: "transform",
            borderRadius: "8px",
          }}
          draggable={false}
        />
      </div>

      {/* Prev / Next — ocultos com zoom ativo */}
      {fotos.length > 1 && !isZoomed && (
        <>
          <button
            type="button"
            onClick={onAnterior}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors"
            style={{
              color: "rgba(255,255,255,0.8)",
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onProximo}
            aria-label="Próxima foto"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors"
            style={{
              color: "rgba(255,255,255,0.8)",
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots — ocultos com zoom ativo */}
      {fotos.length > 1 && fotos.length <= 12 && !isZoomed && (
        <div className="flex justify-center gap-1.5 py-4 shrink-0">
          {fotos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSetIndice(i)}
              className="rounded-full transition-all duration-200"
              style={{
                height: "6px",
                width: i === indice ? "20px" : "6px",
                backgroundColor:
                  i === indice ? "#fff" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
