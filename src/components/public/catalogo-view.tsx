"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, MessageCircle, Search, X, PackageOpen, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProdutoBottomSheet, type ProdutoSheet } from "./cardapio/produto-bottom-sheet";

interface Variacao {
  id: string;
  nome: string;
  preco: number;
}

interface Item {
  id: string;
  tipo: "PRODUTO" | "SERVICO";
  titulo: string;
  descricao: string | null;
  preco: number | null;
  precoPromo: number | null;
  promoFim: string | null;
  destaque: boolean;
  imagens: string[];
  variacoes: Variacao[];
}

interface Props {
  nome: string;
  logo: string | null;
  slug: string;
  whatsapp: string | null;
  telefone: string | null;
  produtos: Item[];
  servicos: Item[];
  now: number;
}

type Aba = "produtos" | "servicos";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isPromoAtiva(precoPromo: number | null, promoFim: string | null, now: number) {
  if (precoPromo == null) return false;
  if (!promoFim) return true;
  return new Date(promoFim).getTime() > now;
}

function ItemCard({ item, now, onClick }: { item: Item; now: number; onClick: () => void }) {
  const promoAtiva = isPromoAtiva(item.precoPromo, item.promoFim, now);
  const precoBase = item.preco ?? item.variacoes[0]?.preco ?? null;
  const precoExibido = promoAtiva ? item.precoPromo! : precoBase;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm text-left active:scale-[0.97] transition-transform w-full"
    >
      <div className="relative w-full bg-stone-100" style={{ aspectRatio: "4/3" }}>
        {item.imagens[0] ? (
          <Image
            src={item.imagens[0]}
            alt={item.titulo}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            {item.tipo === "SERVICO"
              ? <Wrench className="h-8 w-8 text-stone-300" />
              : <PackageOpen className="h-8 w-8 text-stone-300" />}
          </div>
        )}
        {item.destaque && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              ✦ Destaque
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-sm font-semibold text-stone-900 leading-snug">{item.titulo}</p>
        {item.descricao && (
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-2 leading-relaxed">{item.descricao}</p>
        )}
        <div className="mt-auto pt-2">
          {item.variacoes.length > 0 ? (
            <p className="text-xs text-stone-500">
              a partir de{" "}
              <span className="font-bold text-stone-800">
                {formatBRL(Math.min(...item.variacoes.map((v) => v.preco)))}
              </span>
            </p>
          ) : precoExibido != null ? (
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-stone-900">{formatBRL(precoExibido)}</span>
              {promoAtiva && precoBase != null && precoBase !== precoExibido && (
                <span className="text-xs text-stone-400 line-through">{formatBRL(precoBase)}</span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function CatalogoView({
  nome,
  logo,
  slug,
  whatsapp,
  telefone,
  produtos,
  servicos,
  now,
}: Props) {
  const temProdutos = produtos.length > 0;
  const temServicos = servicos.length > 0;

  const abaInicial: Aba = temProdutos ? "produtos" : "servicos";
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [busca, setBusca] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProdutoSheet | null>(null);

  const itensAtivos = aba === "produtos" ? produtos : servicos;
  const buscaAtiva = busca.trim().length > 0;

  const itensFiltrados = buscaAtiva
    ? itensAtivos.filter(
        (p) =>
          p.titulo.toLowerCase().includes(busca.toLowerCase()) ||
          p.descricao?.toLowerCase().includes(busca.toLowerCase()),
      )
    : itensAtivos;

  function toSheet(item: Item): ProdutoSheet {
    return {
      ...item,
      categoriaNome: item.tipo === "SERVICO" ? "Serviço" : "Produto",
    };
  }

  return (
    <div className="min-h-screen bg-[#F5EFE4]">
      {/* Header */}
      <div className="px-4 pt-4 pb-5">
        <Link
          href={`/vitrine/${slug}`}
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
            <h1 className="font-bold text-lg leading-tight text-stone-900">{nome}</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              {temProdutos && temServicos
                ? "Produtos e serviços"
                : temProdutos
                  ? "Catálogo de produtos"
                  : "Catálogo de serviços"}
            </p>
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
            aria-label="Buscar"
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
                type="text"
                placeholder="Buscar..."
                value={busca}
                autoFocus
                onChange={(e) => setBusca(e.target.value)}
                className="w-full h-9 rounded-full bg-white border border-stone-200 pl-9 pr-4 text-[16px] placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setSearchOpen(false); setBusca(""); }}
              className="text-sm font-medium text-stone-600 hover:text-stone-900 shrink-0 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex overflow-x-auto scrollbar-none px-2">
            {temProdutos && (
              <button
                type="button"
                onClick={() => setAba("produtos")}
                className={cn(
                  "shrink-0 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5",
                  aba === "produtos"
                    ? "border-stone-800 text-stone-900"
                    : "border-transparent text-stone-400 hover:text-stone-700",
                )}
              >
                <PackageOpen className="h-3.5 w-3.5" />
                Produtos
              </button>
            )}
            {temServicos && (
              <button
                type="button"
                onClick={() => setAba("servicos")}
                className={cn(
                  "shrink-0 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5",
                  aba === "servicos"
                    ? "border-stone-800 text-stone-900"
                    : "border-transparent text-stone-400 hover:text-stone-700",
                )}
              >
                <Wrench className="h-3.5 w-3.5" />
                Serviços
              </button>
            )}
          </div>
        )}
      </div>

      <ProdutoBottomSheet
        produto={selectedItem}
        now={now}
        onClose={() => setSelectedItem(null)}
      />

      {/* Conteúdo */}
      <div className="px-4 pt-5 pb-16">
        {buscaAtiva && (
          <p className="text-xs text-stone-400 mb-4">
            {itensFiltrados.length === 0
              ? `Nenhum resultado para "${busca}"`
              : `${itensFiltrados.length} resultado${itensFiltrados.length !== 1 ? "s" : ""} para "${busca}"`}
          </p>
        )}

        {itensFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-400">
            {aba === "servicos"
              ? <Wrench className="h-10 w-10 opacity-40" />
              : <PackageOpen className="h-10 w-10 opacity-40" />}
            <p className="text-sm">
              {buscaAtiva ? `Nenhum resultado para "${busca}"` : "Nenhum item disponível."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {itensFiltrados.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                now={now}
                onClick={() => setSelectedItem(toSheet(item))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
