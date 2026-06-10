"use client";

import { useState } from "react";
import { Header } from "@/components/public/home/header";
import { Hero } from "@/components/public/home/hero";
import { Categories } from "@/components/public/home/categories";
import { OpenNow } from "@/components/public/home/open-now";
import { Events } from "@/components/public/home/events";
import { Featured } from "@/components/public/home/featured";
import { PontosTuristicos } from "@/components/public/home/pontos-turisticos";
import { Wave } from "@/components/public/home/waves";
import type { NavId } from "@/components/public/home/bottom-nav";
import type { Categoria } from "@prisma/client";

interface ComercioAberto {
  slug: string;
  nome: string;
  logo: string | null;
  categorias: string[];
  fechaLabel: string;
}

export interface ComercioDestaque {
  slug: string;
  nome: string;
  categorias: string[];
  logo: string | null;
  foto: string | null;
  bairro: string | null;
  aberto: boolean;
  statusLabel: string;
}

export interface EventoHome {
  id: string;
  titulo: string;
  dataStr: string;
  local: string | null;
  imagem: string | null;
  preco: number | null;
  comercioSlug: string;
}

export interface PontoTuristicoHome {
  slug: string;
  nome: string;
  categoria: string;
  foto: string | null;
  dificuldade: string | null;
  distanciaKm: number | null;
  altitudeM: number | null;
}

interface Props {
  categoryCounts: Partial<Record<Categoria, number>>;
  comerciosAbertos: ComercioAberto[];
  comerciosDestaque: ComercioDestaque[];
  eventos: EventoHome[];
  pontos: PontoTuristicoHome[];
}

export function HomeClient({
  categoryCounts,
  comerciosAbertos,
  comerciosDestaque,
  eventos,
  pontos,
}: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [tab, setTab] = useState<NavId>("home");

  return (
    <div style={{ background: "var(--sand-1)", minHeight: "100vh" }}>
      <div className="home-content">
        <Header activeNav={tab} onNavChange={setTab} />
        <main>
          <Hero
            query={query}
            setQuery={setQuery}
            focused={focused}
            setFocused={setFocused}
          />
          <Categories counts={categoryCounts} />
          <Wave from="var(--sand-1)" to="var(--sand-2)" />
          <Featured items={comerciosDestaque} />
          <Wave from="var(--sand-2)" to="var(--sand-1)" flip />
          <OpenNow items={comerciosAbertos} />
          {eventos.length > 0 && <Wave from="var(--sand-1)" to="var(--sand-2)" />}
          <Events eventos={eventos} />
          {pontos.length > 0 && eventos.length > 0 && (
            <Wave from="var(--sand-2)" to="var(--sand-1)" flip />
          )}
          <PontosTuristicos pontos={pontos} />
        </main>
      </div>
    </div>
  );
}
