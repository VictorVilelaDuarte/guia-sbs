"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mountain, Home, Map, User } from "lucide-react"

export type NavId = "home" | "map" | "pt" | "me"

const NAV_ITEMS = [
  { id: "home", label: "Início",           href: "/",                   Glyph: Home     },
  { id: "map",  label: "Mapa",             href: "/mapa",               Glyph: Map      },
  { id: "pt",   label: "Pontos Turísticos",href: "/pontos-turisticos",  Glyph: Mountain },
  { id: "me",   label: "Você",             href: "/",                   Glyph: User     },
]

export function BottomNav() {
  const pathname = usePathname()

  function isActive(_href: string, id: string): boolean {
    if (id === "pt") return pathname.startsWith("/pontos-turisticos")
    if (id === "home") return pathname === "/"
    if (id === "map") return pathname.startsWith("/mapa")
    return false
  }

  return (
    <div style={{
      position: "fixed", left: "50%", transform: "translateX(-50%)",
      bottom: 24, zIndex: 40,
      width: "calc(100% - 28px)", maxWidth: 452,
    }}>
      <div className="blur-bar shadow-pill" style={{
        background: "rgba(44,36,22,.92)",
        borderRadius: 999,
        padding: "8px 10px",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        border: "1px solid rgba(245,240,232,.08)",
      }}>
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
