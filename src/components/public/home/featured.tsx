import { IconStar, IconHeart, IconPin } from "./icons"
import { PhotoPH } from "./photo-ph"

const ITEMS = [
  { name: "Pousada Vale da Névoa", cat: "Hospedagem",          addr: "Centro, SBS",          rating: 4.9, photo: ["#8c7250","#2a1c0a","#5a4424"] as [string,string,string], status: "Aberto" },
  { name: "Restaurante Montanha",  cat: "Restaurante · Truta", addr: "Estrada do Baú, Km 4", rating: 4.8, photo: ["#a16438","#2c1a0a","#6e4220"] as [string,string,string], status: "Aberto" },
]

export function Featured() {
  return (
    <div className="home-px" style={{ background: "var(--sand-2)", paddingTop: 12, paddingBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <IconStar width="20" height="20" style={{ color: "var(--amber)" } as React.CSSProperties}/>
        <h2 className="serif" style={{ margin: 0, fontSize: 21, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Em destaque
        </h2>
      </div>
      <div className="featured-list">
        {ITEMS.map((it, i) => (
          <div key={i} className="press shadow-card" style={{
            background: "#FBF7EE", borderRadius: 24, overflow: "hidden",
            border: "1px solid rgba(212,201,176,.5)", cursor: "pointer",
          }}>
            <div style={{ position: "relative" }}>
              <PhotoPH palette={it.photo} label={`f${i}`} ratio="16/9"/>
              <div style={{
                position: "absolute", top: 12, left: 12,
                background: "rgba(245,240,232,.95)", color: "var(--terra)",
                padding: "5px 11px 5px 9px", borderRadius: 999,
                fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 5,
              }}>
                <IconStar width="11" height="11" style={{ color: "var(--amber)" } as React.CSSProperties}/>
                Destaque
              </div>
              <button style={{
                position: "absolute", top: 12, right: 12,
                width: 34, height: 34, borderRadius: 999,
                background: "rgba(245,240,232,.95)", border: "none",
                display: "grid", placeItems: "center", cursor: "pointer",
                color: "var(--terra)",
              }} aria-label="Salvar">
                <IconHeart width="15" height="15"/>
              </button>
            </div>
            <div style={{ padding: "14px 16px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.01em", lineHeight: 1.15 }}>
                    {it.name}
                  </div>
                  <div style={{ color: "var(--ink-2)", fontSize: 12, marginTop: 3 }}>{it.cat}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--amber)", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                  <IconStar width="13" height="13"/>
                  <span>{it.rating}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 11.5 }}>
                  <IconPin width="12" height="12"/>
                  {it.addr}
                </div>
                <div style={{
                  background: "#f0d9c0", color: "var(--terra)",
                  padding: "4px 10px", borderRadius: 999,
                  fontSize: 10.5, fontWeight: 700,
                }}>{it.status}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
