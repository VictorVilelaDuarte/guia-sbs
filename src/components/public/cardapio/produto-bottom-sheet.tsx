/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackCtx } from "@/lib/analytics/track";
import type { AddCarrinho } from "@/lib/carrinho";

const DIAMOND = "✦";

interface Variacao {
  id: string;
  nome: string;
  preco: number;
}

export interface ProdutoSheet {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  precoPromo: number | null;
  promoFim: string | null;
  destaque: boolean;
  imagens: string[];
  variacoes: Variacao[];
  categoriaNome: string;
}

interface Props {
  produto: ProdutoSheet | null;
  now: number;
  onClose: () => void;
  // Quando presente, ativa o "modo pedido": variações selecionáveis, seletor de
  // quantidade, campo de observação e botão "Adicionar ao carrinho" no rodapé.
  // Ausente = comportamento somente-leitura (catálogo / cardápio sem pedido).
  onAddToCart?: (add: AddCarrinho) => void;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isPromoAtiva(
  precoPromo: number | null,
  promoFim: string | null,
  now: number,
): boolean {
  if (precoPromo == null) return false;
  if (!promoFim) return true;
  return new Date(promoFim).getTime() > now;
}

export function ProdutoBottomSheet({ produto, now, onClose, onAddToCart }: Props) {
  // Mantém o último produto em memória para renderizar durante o fechamento
  const [mounted, setMounted] = useState(false);
  const [displayed, setDisplayed] = useState<ProdutoSheet | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Modo pedido — seleção de variação, quantidade e observação
  const modoPedido = !!onAddToCart;
  const [variacaoSel, setVariacaoSel] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");

  // Arrastar para fechar
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  // Swipe horizontal no carrossel
  const carouselTouchStartX = useRef(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (produto) {
      setDisplayed(produto);
      setCarouselIndex(0);
      setVariacaoSel(produto.variacoes[0]?.id ?? null);
      setQuantidade(1);
      setObservacao("");
      // no-op fora de páginas de comércio (contexto setado pelo VitrineTracker)
      trackCtx("item_view", { meta: { itemId: produto.id, titulo: produto.titulo } });
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setIsVisible(false);
      const t = setTimeout(() => setDisplayed(null), 400);
      return () => clearTimeout(t);
    }
  }, [produto]);

  // Bloqueia scroll da página quando aberto.
  // overflow:hidden no body não funciona no iOS Safari — o fix confiável é
  // travar o body em position:fixed (salva e restaura a posição do scroll).
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

  // Fecha com Escape
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, onClose]);

  // Arrastar o handle para baixo fecha o sheet
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
    if (dragOffset > 80) {
      onClose();
    }
    setDragOffset(0);
  }

  // Swipe horizontal no carrossel
  function onCarouselTouchStart(e: React.TouchEvent) {
    carouselTouchStartX.current = e.touches[0].clientX;
  }

  function onCarouselTouchEnd(e: React.TouchEvent) {
    if (!displayed) return;
    const delta = e.changedTouches[0].clientX - carouselTouchStartX.current;
    const count = displayed.imagens.length;
    if (delta < -40 && carouselIndex < count - 1)
      setCarouselIndex((i) => i + 1);
    if (delta > 40 && carouselIndex > 0) setCarouselIndex((i) => i - 1);
  }

  const portalRoot =
    typeof document !== "undefined"
      ? (document.getElementById("portal-root") ?? document.body)
      : null;

  if (!mounted || !displayed || !portalRoot) return null;

  const {
    titulo,
    descricao,
    preco,
    precoPromo,
    promoFim,
    destaque,
    imagens,
    variacoes,
    categoriaNome,
  } = displayed;

  const promoAtiva = isPromoAtiva(precoPromo, promoFim, now);
  const precoBase = preco ?? variacoes[0]?.preco ?? null;
  const precoFinal = promoAtiva ? precoPromo! : precoBase;
  const temMultiImagens = imagens.length > 1;

  // Modo pedido: preço unitário da opção escolhida e total da linha
  const precoUnitSel =
    variacoes.length > 0
      ? (variacoes.find((v) => v.id === variacaoSel)?.preco ?? null)
      : precoFinal;
  const totalLinha = precoUnitSel != null ? precoUnitSel * quantidade : null;

  const handleAdd = () => {
    if (!onAddToCart || precoUnitSel == null) return;
    const variacao = variacoes.find((v) => v.id === variacaoSel) ?? null;
    onAddToCart({
      produtoId: displayed.id,
      titulo,
      imagem: imagens[0] ?? null,
      variacaoId: variacoes.length > 0 ? (variacao?.id ?? null) : null,
      variacaoNome: variacoes.length > 0 ? (variacao?.nome ?? null) : null,
      precoUnit: precoUnitSel,
      quantidade,
      observacao: observacao.trim() || null,
    });
    onClose();
  };

  return createPortal(
    /* Wrapper fixo cobre 100% do viewport — garante full-width mesmo com
       body { flex } no Safari iOS, onde position:fixed filhos de flex items
       podem ter o containing block errado. Sheet e backdrop usam
       position:absolute dentro deste wrapper. */
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50 }}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "absolute left-0 right-0 bottom-0 flex flex-col rounded-t-3xl overflow-hidden bg-white",
          "max-h-[96svh] transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          isVisible ? "translate-y-0" : "translate-y-full",
        )}
        style={
          dragOffset > 0
            ? { transform: `translateY(${dragOffset}px)`, transition: "none" }
            : undefined
        }
      >
        {/* Handle — área de drag */}
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
          {imagens.length > 0 ? (
            <>
              {/* Slides — absolute inset-0 garante que cada slide tenha
                  exatamente a largura do container, e translateX(n*100%)
                  funciona corretamente. */}
              {imagens.map((url, i) => (
                <div
                  key={i}
                  className="absolute inset-0 transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(${(i - carouselIndex) * 100}%)`,
                  }}
                >
                  <Image
                    src={url}
                    alt={`${titulo} — foto ${i + 1}`}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    priority={i === 0}
                  />
                </div>
              ))}

              {/* Seta esquerda */}
              {carouselIndex > 0 && (
                <button
                  onClick={() => setCarouselIndex((i) => i - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Seta direita */}
              {carouselIndex < imagens.length - 1 && (
                <button
                  onClick={() => setCarouselIndex((i) => i + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              {/* Contador */}
              {temMultiImagens && (
                <div className="absolute bottom-3 right-3 bg-black/40 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {carouselIndex + 1} / {imagens.length}
                </div>
              )}

              {/* Dots */}
              {temMultiImagens && (
                <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {imagens.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIndex(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-200",
                        i === carouselIndex
                          ? "w-4 bg-white"
                          : "w-1.5 bg-white/50",
                      )}
                      aria-label={`Ir para foto ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Placeholder sem foto */
            <div className="h-full w-full flex items-center justify-center bg-stone-100">
              <span className="font-serif text-5xl text-stone-300">
                {titulo[0]}
              </span>
            </div>
          )}

          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thumbnails */}
        {temMultiImagens && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 py-3 shrink-0 border-b border-stone-100">
            {imagens.map((url, i) => (
              <button
                key={i}
                onClick={() => setCarouselIndex(i)}
                className={cn(
                  "relative h-14 w-14 shrink-0 rounded-lg overflow-hidden transition-all duration-200",
                  i === carouselIndex
                    ? "ring-2 ring-offset-1 ring-stone-800 opacity-100"
                    : "opacity-45 hover:opacity-70",
                )}
                aria-label={`Foto ${i + 1}`}
              >
                <Image
                  src={url}
                  alt={`Miniatura ${i + 1}`}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto overscroll-y-contain flex-1 px-5 pt-4 pb-10">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
              {categoriaNome}
            </span>
            {destaque && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {DIAMOND} Destaque
              </span>
            )}
          </div>

          {/* Título */}
          <h2 className="font-serif text-3xl font-bold text-stone-900 leading-tight mb-3">
            {titulo}
          </h2>

          {/* Descrição */}
          {descricao && (
            <p className="text-sm text-stone-600 leading-relaxed">
              {descricao}
            </p>
          )}

          {/* Preço / variações */}
          <div className={cn(descricao ? "mt-4" : "mt-1")}>
            {variacoes.length > 0 ? (
              modoPedido ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-0.5">
                    Escolha uma opção
                  </p>
                  {variacoes.map((v) => {
                    const sel = v.id === variacaoSel;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVariacaoSel(v.id)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                          sel
                            ? "border-stone-800 bg-stone-50"
                            : "border-stone-200 hover:border-stone-300",
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-full border-2",
                              sel ? "border-stone-800" : "border-stone-300",
                            )}
                          >
                            {sel && (
                              <span className="h-2 w-2 rounded-full bg-stone-800" />
                            )}
                          </span>
                          <span className="text-sm text-stone-700">{v.nome}</span>
                        </span>
                        <span className="text-sm font-bold text-stone-900">
                          {formatBRL(v.preco)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-stone-100">
                  {variacoes.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="text-sm text-stone-600">{v.nome}</span>
                      <span className="text-sm font-bold text-stone-900">
                        {formatBRL(v.preco)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : precoFinal != null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-stone-900">
                  {formatBRL(precoFinal)}
                </span>
                {promoAtiva &&
                  precoBase != null &&
                  precoBase !== precoFinal && (
                    <span className="text-sm text-stone-400 line-through">
                      {formatBRL(precoBase)}
                    </span>
                  )}
              </div>
            ) : null}
          </div>

          {/* Modo pedido: quantidade + observação */}
          {modoPedido && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-700">
                  Quantidade
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                    disabled={quantidade <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-700 disabled:opacity-40 active:bg-stone-100"
                    aria-label="Diminuir"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center text-base font-semibold tabular-nums">
                    {quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantidade((q) => Math.min(99, q + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-700 active:bg-stone-100"
                    aria-label="Aumentar"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">
                  Observação{" "}
                  <span className="font-normal text-stone-400">(opcional)</span>
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                  maxLength={280}
                  placeholder="Ex: sem cebola, ponto da carne…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-[16px] placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rodapé — botão adicionar (modo pedido) */}
        {modoPedido && (
          <div className="shrink-0 border-t border-stone-100 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleAdd}
              disabled={precoUnitSel == null}
              className="flex w-full items-center justify-between rounded-2xl bg-stone-900 px-5 py-3.5 font-semibold text-white transition-colors hover:bg-stone-800 active:bg-black disabled:opacity-50"
            >
              <span>Adicionar</span>
              {totalLinha != null && <span>{formatBRL(totalLinha)}</span>}
            </button>
          </div>
        )}
      </div>
    </div>,
    portalRoot,
  );
}
