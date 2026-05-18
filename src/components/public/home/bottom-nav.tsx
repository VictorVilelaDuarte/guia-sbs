import { IconHome, IconMap, IconHeart, IconUser } from "./icons"

export type NavId = "home" | "map" | "fav" | "me"

const NAV_ITEMS: { id: NavId; label: string; Glyph: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement }[] = [
  { id: "home", label: "Início", Glyph: IconHome },
  { id: "map",  label: "Mapa",   Glyph: IconMap },
  { id: "fav",  label: "Salvos", Glyph: IconHeart },
  { id: "me",   label: "Você",   Glyph: IconUser },
]

interface BottomNavProps {
  active: NavId
  setActive: (id: NavId) => void
}

export function BottomNav({ active, setActive }: BottomNavProps) {
  return (
    <div style={{
      position: "fixed", left: "50%", transform: "translateX(-50%)",
      bottom: 24, zIndex: 40,
      width: "calc(100% - 28px)",
      maxWidth: 452,
    }}>
      <div className="blur-bar shadow-pill" style={{
        background: "rgba(44,36,22,.92)",
        borderRadius: 999,
        padding: "8px 10px",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        border: "1px solid rgba(245,240,232,.08)",
      }}>
        {NAV_ITEMS.map(({ id, label, Glyph }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => setActive(id)} style={{
              border: "none", background: isActive ? "var(--terra)" : "transparent",
              color: isActive ? "#F5F0E8" : "rgba(245,240,232,.7)",
              padding: isActive ? "8px 14px" : "8px 10px",
              borderRadius: 999, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: "inherit", fontWeight: 600, fontSize: 12,
              transition: "all .25s",
            }}>
              <Glyph width="18" height="18"/>
              {isActive && <span>{label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
