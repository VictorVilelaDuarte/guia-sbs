"use client";

import { useState } from "react";
import { Header } from "@/components/public/home/header";
import { Hero } from "@/components/public/home/hero";
import { Categories } from "@/components/public/home/categories";
import { OpenNow } from "@/components/public/home/open-now";
import { Events } from "@/components/public/home/events";
import { Featured } from "@/components/public/home/featured";
import { Wave } from "@/components/public/home/waves";
import type { NavId } from "@/components/public/home/bottom-nav";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
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
          <Categories active={activeCat} setActive={setActiveCat} />
          <Wave from="var(--sand-1)" to="var(--sand-2)" />
          <OpenNow />
          <Wave from="var(--sand-2)" to="var(--sand-1)" flip />
          <Events />
          <Wave from="var(--sand-1)" to="var(--sand-2)" />
          <Featured />
        </main>
      </div>
    </div>
  );
}
