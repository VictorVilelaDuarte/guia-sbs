import { IconPeak } from "./icons"
import { FooterTopCurve } from "./waves"

export function Footer() {
  return (
    <div>
      <FooterTopCurve from="var(--sand-2)" to="var(--ink)"/>
      <div className="home-px footer-body" style={{ background: "var(--ink)", color: "var(--sand-1)", paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: "linear-gradient(160deg, #C4873A, #8B4513)",
            display: "grid", placeItems: "center", color: "#F5F0E8",
          }}>
            <IconPeak width="20" height="20"/>
          </div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>
            Guia <span style={{ color: "var(--amber-soft)" }}>SBS</span>
          </div>
        </div>
        <div style={{ color: "var(--sand-2)", fontSize: 13, lineHeight: 1.5, maxWidth: 280 }}>
          São Bento do Sapucaí, SP<br/>
          <span style={{ color: "var(--muted)" }}>Serra da Mantiqueira · 1.400 m</span>
        </div>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "10px 18px",
          marginTop: 22, paddingTop: 18,
          borderTop: "1px solid rgba(245,240,232,.12)",
        }}>
          {["Sobre", "Contato", "Para comerciantes", "Termos"].map(l => (
            <a key={l} href="#" style={{
              color: "var(--sand-2)", fontSize: 13, textDecoration: "none", fontWeight: 500,
            }}>{l}</a>
          ))}
        </div>
        <div style={{ color: "var(--ink-2)", fontSize: 11, marginTop: 22, opacity: .8 }}>
          © 2026 Guia SBS · Feito na serra
        </div>
      </div>
    </div>
  )
}
