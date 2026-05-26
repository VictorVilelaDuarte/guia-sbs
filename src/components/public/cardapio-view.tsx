"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, MessageCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProdutoBottomSheet, type ProdutoSheet } from "./produto-bottom-sheet";

const DIAMOND = "✦";
const DESTAQUES_ID = "__destaques__";

interface Variacao {
  id: string;
  nome: string;
  preco: number;
}

interface Produto {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  precoPromo: number | null;
  promoFim: string | null;
  destaque: boolean;
  imagens: string[];
  variacoes: Variacao[];
}

interface Categoria {
  id: string;
  nome: string;
  produtos: Produto[];
}

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
  const [selectedProduto, setSelectedProduto] = useState<ProdutoSheet | null>(null);
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
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
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
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setSearchOpen(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors shrink-0 shadow-sm"
          >
            <Search className="h-4 w-4" />
          </a>
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
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setBusca("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                closeSearch();
              }}
              className="text-sm font-medium text-stone-600 hover:text-stone-900 shrink-0 transition-colors"
            >
              Cancelar
            </a>
          </div>
        ) : (
          <div
            ref={tabsRef}
            className="flex overflow-x-auto scrollbar-none px-2"
          >
            {tabs.map((tab) => (
              <a
                key={tab.id}
                href="#"
                data-catid={tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(tab.id);
                }}
                className={cn(
                  "shrink-0 px-2.5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeId === tab.id
                    ? "border-stone-800 text-stone-900"
                    : "border-transparent text-stone-400 hover:text-stone-700",
                )}
              >
                {tab.nome}
              </a>
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
                  <ItemRow produto={p} now={now} onClick={() => setSelectedProduto(p)} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Seção Em destaque */}
            {temDestaques && (
              <section
                id={DESTAQUES_ID}
                className="scroll-mt-[48px] pt-6 pb-6"
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

            {/* Seções por categoria */}
            {categorias.map((cat) => (
              <section
                key={cat.id}
                id={cat.id}
                className="scroll-mt-[48px]"
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

function DestaqueCard({
  produto,
  now,
  onClick,
}: {
  produto: Produto & { categoriaNome: string };
  now: number;
  onClick: () => void;
}) {
  const promoAtiva = isPromoAtiva(produto.precoPromo, produto.promoFim, now);
  const precoBase = produto.preco ?? produto.variacoes[0]?.preco ?? null;
  const precoExibido = promoAtiva ? produto.precoPromo! : precoBase;

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 w-44 rounded-2xl overflow-hidden bg-white shadow-sm text-left active:scale-[0.97] transition-transform"
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
      <div className="p-3">
        <p className="text-sm font-semibold text-stone-900 leading-snug">
          {produto.titulo}
        </p>
        {produto.descricao && (
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-2 italic">
            &ldquo;{produto.descricao}&rdquo;
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

function ItemRow({
  produto,
  now,
  onClick,
}: {
  produto: Produto & { categoriaNome?: string };
  now: number;
  onClick: () => void;
}) {
  const promoAtiva = isPromoAtiva(produto.precoPromo, produto.promoFim, now);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-4 w-full text-left hover:bg-stone-50 active:bg-stone-100 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-stone-900 leading-snug">
            {produto.titulo}
          </p>
          {produto.destaque && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide border border-stone-300 text-stone-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              {DIAMOND} Destaque
            </span>
          )}
        </div>
        {produto.descricao && (
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-3 leading-relaxed">
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
