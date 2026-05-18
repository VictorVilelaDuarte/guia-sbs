import { IconPin, IconCalendar } from "./icons"
import { PhotoPH } from "./photo-ph"

const EVENTS = [
  { date: { d: "17", m: "Mai", weekday: "Sáb" }, title: "Festa do Pinhão",     where: "Praça Central",   tag: "Gratuito", photo: ["#7a4a22","#2a1a08","#4d2c12"] as [string,string,string] },
  { date: { d: "18", m: "Mai", weekday: "Dom" }, title: "Trilha Pedra do Baú", where: "Base Bauzinho",   tag: "R$ 35",    photo: ["#8b6238","#2a1a0c","#5e3e1f"] as [string,string,string] },
  { date: { d: "24", m: "Mai", weekday: "Sáb" }, title: "Feira de Artesanato", where: "Largo da Igreja", tag: "Gratuito", photo: ["#a06840","#3a2010","#6e4422"] as [string,string,string] },
]

export function Events() {
  return (
    <div style={{ background: "var(--sand-1)", paddingTop: 10, paddingBottom: 26 }}>
      {/* Section title */}
      <div className="home-px" style={{ paddingTop: 10, paddingBottom: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 className="serif" style={{ margin: 0, fontSize: 21, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Acontece em <em style={{ color: "var(--terra)" }}>SBS</em>
        </h2>
        <button style={{
          border: "none", background: "transparent", color: "var(--terra)",
          fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
        }}>Agenda →</button>
      </div>
      {/* Carousel / grid */}
      <div className="home-px">
        <div className="h-scroll no-scrollbar">
          {EVENTS.map((e, i) => (
            <div key={i} className="press shadow-card event-card" style={{
              width: 280, borderRadius: 24, overflow: "hidden",
              position: "relative", cursor: "pointer",
            }}>
              <div style={{ position: "absolute", inset: 0 }}>
                <PhotoPH palette={e.photo} label={`e${i}`} ratio="auto"/>
              </div>
              <div style={{ position: "absolute", inset: 0,
                background: "linear-gradient(180deg, rgba(20,12,5,.05) 0%, rgba(20,12,5,.7) 100%)" }}/>
              <div style={{
                position: "absolute", top: 14, left: 14,
                background: "var(--amber)", color: "#2C2416",
                padding: "5px 12px", borderRadius: 999,
                fontSize: 11, fontWeight: 700, letterSpacing: ".02em",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <IconCalendar width="11" height="11"/>
                {e.date.weekday} {e.date.d} {e.date.m}
              </div>
              <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, color: "#F8F2E6" }}>
                <div className="serif" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,.4)" }}>
                  {e.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, opacity: .92 }}>
                    <IconPin width="12" height="12"/>
                    {e.where}
                  </div>
                  <div style={{
                    background: "rgba(245,240,232,.92)",
                    color: e.tag === "Gratuito" ? "#4a5d3a" : "var(--terra)",
                    padding: "4px 10px", borderRadius: 999,
                    fontSize: 11, fontWeight: 700,
                  }}>{e.tag}</div>
                </div>
              </div>
            </div>
          ))}
          <div className="h-scroll-spacer" style={{ width: 4, flexShrink: 0 }}/>
        </div>
      </div>
    </div>
  )
}
