"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mountain, Home, Map, Landmark } from "lucide-react"

export type NavId = "home" | "map" | "pt" | "cidade"

const NAV_ITEMS = [
  { id: "home",   label: "Início",           href: "/",                      Glyph: Home     },
  { id: "map",    label: "Mapa",             href: "/mapa",                  Glyph: Map      },
  { id: "pt",     label: "Pontos Turísticos",href: "/pontos-turisticos",     Glyph: Mountain },
  { id: "cidade", label: "A cidade",         href: "/sao-bento-do-sapucai",  Glyph: Landmark },
]

// Rotas do (public) onde o nav flutuante não deve aparecer — a landing de venda
// fala com o comerciante, não com o visitante do guia, e tem CTAs próprios.
const HIDDEN_PREFIXES = ["/para-comerciantes"]

export function BottomNav() {
  const pathname = usePathname()

  // O cardápio (e seu checkout) é uma experiência app-like focada, com header e
  // tabs próprios; o nav flutuante do guia atrapalha e colide com a barra de
  // carrinho do pedido online. Oculto em qualquer rota .../cardapio[/...].
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p)) || pathname.includes("/cardapio")) {
    return null
  }

  function isActive(_href: string, id: string): boolean {
    if (id === "pt") return pathname.startsWith("/pontos-turisticos")
    if (id === "home") return pathname === "/"
    if (id === "map") return pathname.startsWith("/mapa")
    if (id === "cidade") return pathname.startsWith("/sao-bento-do-sapucai")
    return false
  }

  return (
    <div style={{
      position: "fixed", left: "50%", transform: "translateX(-50%)",
      bottom: 24, zIndex: 40,
      width: "calc(100% - 28px)", maxWidth: 452,
    }}>
      {/* Filtro de refração — distorce o que passa atrás do vidro.
          Turbulência fractal suave → deslocamento sutil dos pixels.
          Só tem efeito onde backdrop-filter: url() é suportado (Chrome/Android);
          iOS Safari ignora e mantém o vidro base. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="liquid-refract" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.011 0.016"
            numOctaves={2}
            seed={4}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="1.4" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale={9}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div className="liquid-glass" style={{
        borderRadius: 999,
        padding: "8px 10px",
        display: "flex", justifyContent: "space-around", alignItems: "center",
      }}>
        <span aria-hidden className="liquid-glass-refract" />
        {NAV_ITEMS.map(({ id, label, href, Glyph }) => {
          const active = isActive(href, id)
          return (
            <Link key={id} href={href} style={{
              background: active ? "var(--terra)" : "transparent",
              color: active ? "#F5F0E8" : "rgba(245,240,232,.7)",
              padding: active ? "8px 14px" : "8px 10px",
              borderRadius: 999,
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: "inherit", fontWeight: 600, fontSize: 12,
              transition: "all .25s", textDecoration: "none",
            }}>
              <Glyph width="18" height="18" />
              {active && <span>{label}</span>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
