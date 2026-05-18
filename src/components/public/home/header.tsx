import { IconPeak, IconSearch, IconHome, IconMap, IconHeart, IconUser } from "./icons"
import type { NavId } from "./bottom-nav"

interface HeaderProps {
  activeNav: NavId
  onNavChange: (id: NavId) => void
}

const NAV_ITEMS: { id: NavId; label: string; Glyph: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement }[] = [
  { id: "home", label: "Início", Glyph: IconHome },
  { id: "map",  label: "Mapa",   Glyph: IconMap },
  { id: "fav",  label: "Salvos", Glyph: IconHeart },
  { id: "me",   label: "Você",   Glyph: IconUser },
]

export function Header({ activeNav, onNavChange }: HeaderProps) {
  return (
    <div className="home-px" style={{
      position: "sticky", top: 0, zIndex: 30,
      background: "rgba(245, 240, 232, 0.92)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      borderBottom: "1px solid rgba(212, 201, 176, .55)",
      paddingTop: 14, paddingBottom: 12,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "linear-gradient(160deg, #C4873A, #8B4513)",
          display: "grid", placeItems: "center",
          color: "#F5F0E8",
          boxShadow: "0 4px 12px -4px rgba(139,69,19,.6)",
        }}>
          <IconPeak width="18" height="18"/>
        </div>
        <div style={{ lineHeight: 1 }}>
          <div className="serif" style={{ fontWeight: 700, fontSize: 18, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Guia <span style={{ color: "var(--terra)" }}>SBS</span>
          </div>
          <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 2, letterSpacing: ".06em", textTransform: "uppercase" }}>
            Serra da Mantiqueira
          </div>
        </div>
      </div>

      {/* Desktop nav — hidden on mobile */}
      <nav className="header-desktop-nav" style={{ flex: 1, justifyContent: "center" }}>
        {NAV_ITEMS.map(({ id, label, Glyph }) => {
          const isActive = activeNav === id
          return (
            <button key={id} onClick={() => onNavChange(id)} className="press" style={{
              border: "none",
              background: isActive ? "var(--terra)" : "transparent",
              color: isActive ? "#F5F0E8" : "var(--ink-2)",
              padding: "8px 14px",
              borderRadius: 999,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: "inherit", fontWeight: 600, fontSize: 13,
              transition: "all .2s",
            }}>
              <Glyph width="16" height="16"/>
              {label}
            </button>
          )
        })}
      </nav>

      {/* Search button */}
      <button className="press" aria-label="Buscar" style={{
        width: 38, height: 38, borderRadius: 999, flexShrink: 0,
        background: "var(--sand-2)", border: "1px solid rgba(212,201,176,.7)",
        color: "var(--terra)", display: "grid", placeItems: "center", cursor: "pointer",
      }}>
        <IconSearch width="18" height="18"/>
      </button>
    </div>
  )
}
