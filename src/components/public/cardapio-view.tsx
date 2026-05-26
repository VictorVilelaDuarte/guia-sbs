"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, MessageCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ProdutoBottomSheet,
  type ProdutoSheet,
} from "./cardapio/produto-bottom-sheet";
import { type Categoria } from "./cardapio/types";
import { DestaqueCard } from "./cardapio/destaque-card";
import { ItemRow } from "./cardapio/item-row";

const DIAMOND = "✦";
const DESTAQUES_ID = "__destaques__";

interface Props {
  nome: string;
  logo: string | null;
  slug: string;
  whatsapp: string | null;
  telefone: string | null;
  statusAgora: { aberto: boolean; label: string } | null;
  categorias: Categoria[];
  now: number;
}

export function CardapioView({
  nome,
  logo,
  slug,
  whatsapp,
  telefone,
  statusAgora,
  categorias,
  now,
}: Props) {
  const produtosEmDestaque = categorias.flatMap((cat) =>
    cat.produtos
      .filter((p) => p.destaque)
      .map((p) => ({ ...p, categoriaNome: cat.nome })),
  );
  const temDestaques = produtosEmDestaque.length > 0;

  const primeiroId = temDestaques ? DESTAQUES_ID : (categorias[0]?.id ?? "");
  const [activeId, setActiveId] = useState(primeiroId);
  const [busca, setBusca] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoSheet | null>(
    null,
  );
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabsRef = useRef<HTMLDivElement>(null);
  const manualScrolling = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const buscaAtiva = busca.trim().length > 0;

  useEffect(() => {
    if (searchOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (manualScrolling.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );
        setActiveId(topmost.target.id);
      },
      { rootMargin: "-48px 0px -50% 0px", threshold: 0 },
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [searchOpen, categorias, temDestaques]);

  useEffect(() => {
    if (!tabsRef.current || searchOpen) return;
    const tab = tabsRef.current.querySelector<HTMLElement>(
      `[data-catid="${activeId}"]`,
    );
    tab?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeId, searchOpen]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setBusca("");
  }

  function scrollToSection(id: string) {
    setActiveId(id);
    const el = sectionRefs.current.get(id);
    if (!el) return;
    manualScrolling.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      manualScrolling.current = false;
    }, 900);
  }

  const resultadosBusca = buscaAtiva
    ? categorias.flatMap((cat) =>
        cat.produtos
          .filter(
            (p) =>
              p.titulo.toLowerCase().includes(busca.toLowerCase()) ||
              p.descricao?.toLowerCase().includes(busca.toLowerCase()),
          )
          .map((p) => ({ ...p, categoriaNome: cat.nome })),
      )
    : [];

  const tabs = [
    ...(temDestaques
      ? [{ id: DESTAQUES_ID, nome: `${DIAMOND} Destaques` }]
      : []),
    ...categorias.map((c) => ({ id: c.id, nome: c.nome })),
  ];

  return (
    <div className="min-h-screen bg-[#F5EFE4]">
      {/* Header */}
      <div className="px-4 pt-4 pb-5">
        <Link
          href={`/comercios/${slug}`}
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 mb-4 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Ver perfil completo
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-stone-200 border-2 border-white shadow-sm">
            {logo ? (
              <Image src={logo} alt={nome} fill className="object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center font-bold text-xl text-stone-500">
                {nome[0]}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-stone-900">
              {nome}
            </h1>
            {statusAgora && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    statusAgora.aberto
                      ? "bg-green-500 animate-pulse"
                      : "bg-rose-400",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    statusAgora.aberto ? "text-green-600" : "text-rose-500",
                  )}
                >
                  {statusAgora.label}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {whatsapp ? (
            <a
              href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-4 py-2.5 rounded-xl transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          ) : telefone ? (
            <a
              href={`tel:${telefone.replace(/\D/g, "")}`}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-stone-800 hover:bg-stone-900 text-white px-4 py-2.5 rounded-xl transition-colors"
            >
              Ligar
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors shrink-0 shadow-sm"
            aria-label="Buscar no cardápio"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sticky: tabs ou busca */}
      <div className="sticky top-0 z-10 bg-[#F5EFE4] border-b border-stone-200">
        {searchOpen ? (
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar no cardápio..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full h-9 rounded-full bg-white border border-stone-200 pl-9 pr-4 text-sm placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={closeSearch}
              className="text-sm font-medium text-stone-600 hover:text-stone-900 shrink-0 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div
            ref={tabsRef}
            className="flex overflow-x-auto scrollbar-none px-2"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-catid={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={cn(
                  "shrink-0 px-2.5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeId === tab.id
                    ? "border-stone-800 text-stone-900"
                    : "border-transparent text-stone-400 hover:text-stone-700",
                )}
              >
                {tab.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      <ProdutoBottomSheet
        produto={selectedProduto}
        now={now}
        onClose={() => setSelectedProduto(null)}
      />

      {/* Conteúdo */}
      <div className="pb-16">
        {buscaAtiva ? (
          <div>
            <p className="text-xs text-stone-400 px-4 py-3">
              {resultadosBusca.length === 0
                ? `Nenhum resultado para "${busca}"`
                : `${resultadosBusca.length} resultado${resultadosBusca.length !== 1 ? "s" : ""} para "${busca}"`}
            </p>
            <div className="divide-y divide-stone-200">
              {resultadosBusca.map((p) => (
                <div key={p.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 px-4 pt-3 pb-0.5">
                    {p.categoriaNome}
                  </p>
                  <ItemRow
                    produto={p}
                    now={now}
                    onClick={() => setSelectedProduto(p)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {temDestaques && (
              <section
                id={DESTAQUES_ID}
                className="scroll-mt-12 pt-6 pb-6"
                ref={(el) => {
                  if (el) sectionRefs.current.set(DESTAQUES_ID, el);
                  else sectionRefs.current.delete(DESTAQUES_ID);
                }}
              >
                <div className="px-4 mb-4">
                  <h2 className="font-serif text-2xl font-bold text-stone-900 flex items-center gap-2">
                    <span className="text-amber-700 text-xl">{DIAMOND}</span>
                    Em destaque
                  </h2>
                  <p className="text-sm text-stone-400 mt-0.5">
                    seleção da casa para hoje
                  </p>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-none px-4 pb-1">
                  {produtosEmDestaque.map((p) => (
                    <DestaqueCard
                      key={p.id}
                      produto={p}
                      now={now}
                      onClick={() => setSelectedProduto(p)}
                    />
                  ))}
                </div>
              </section>
            )}

            {categorias.map((cat) => (
              <section
                key={cat.id}
                id={cat.id}
                className="scroll-mt-12"
                ref={(el) => {
                  if (el) sectionRefs.current.set(cat.id, el);
                  else sectionRefs.current.delete(cat.id);
                }}
              >
                <div className="px-4 pt-6 pb-2">
                  <h2 className="font-serif text-4xl font-bold text-stone-900 leading-none">
                    {cat.nome}
                  </h2>
                  <p className="text-sm text-stone-400 mt-1.5">
                    {cat.produtos.length}{" "}
                    {cat.produtos.length === 1 ? "item" : "itens"}
                  </p>
                </div>
                <div className="divide-y divide-stone-200 mt-2">
                  {cat.produtos.map((p) => (
                    <ItemRow
                      key={p.id}
                      produto={p}
                      now={now}
                      onClick={() =>
                        setSelectedProduto({ ...p, categoriaNome: cat.nome })
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
