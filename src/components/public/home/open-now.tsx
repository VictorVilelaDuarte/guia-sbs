"use client"

import { useState, useEffect } from "react"
import { IconStar, IconHeart } from "./icons"
import { PhotoPH } from "./photo-ph"

const ITEMS = [
  { name: "Família Braga",   cat: "Comida mineira",    closes: "22h", rating: 4.8, photo: ["#a06440","#3d2616","#6b3a1d"] as [string,string,string] },
  { name: "Café da Serra",   cat: "Cafeteria · Brunch", closes: "18h", rating: 4.7, photo: ["#c4873a","#5b3a1a","#8b5a2a"] as [string,string,string] },
  { name: "Pousada Neblina", cat: "Hospedagem",         closes: "—",   rating: 4.9, photo: ["#8a7c5a","#3a2c14","#6b5634"] as [string,string,string] },
  { name: "Mirante do Vale", cat: "Restaurante",        closes: "23h", rating: 4.6, photo: ["#9c5a30","#3a200e","#7a4220"] as [string,string,string] },
]

export function OpenNow() {
  const [nowStr, setNowStr] = useState("")

  useEffect(() => {
    const update = () => setNowStr(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ background: "var(--sand-2)", paddingTop: 10, paddingBottom: 22 }}>
      {/* Section title */}
      <div className="home-px" style={{ paddingTop: 10, paddingBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pulse-wrap"><span className="pulse-ring"/><span className="pulse-dot"/></span>
          <h2 className="serif" style={{ margin: 0, fontSize: 21, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Aberto agora
          </h2>
        </div>
        {nowStr && <span style={{ fontSize: 11, color: "var(--muted)" }}>{nowStr}</span>}
      </div>
      {/* Carousel / grid */}
      <div className="home-px">
        <div className="h-scroll no-scrollbar">
          {ITEMS.map((it, i) => (
            <div key={i} className="press shadow-card" style={{
              width: 248, background: "#FBF7EE",
              borderRadius: 22, overflow: "hidden", cursor: "pointer",
              border: "1px solid rgba(212,201,176,.5)",
            }}>
              <div style={{ position: "relative" }}>
                <PhotoPH palette={it.photo} label={`o${i}`} ratio="5/3"/>
                <button style={{
                  position: "absolute", top: 10, right: 10,
                  width: 30, height: 30, borderRadius: 999,
                  background: "rgba(245,240,232,.92)", border: "none",
                  display: "grid", placeItems: "center", cursor: "pointer",
                  color: "var(--terra)",
                }} aria-label="Salvar">
                  <IconHeart width="14" height="14"/>
                </button>
                <div style={{
                  position: "absolute", bottom: 10, left: 10,
                  background: "#dfe7d4", color: "#4a5d3a",
                  padding: "5px 10px", borderRadius: 999,
                  fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5,
                  border: "1px solid rgba(120,140,100,.25)",
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: "#6b8550" }}/>
                  {it.closes === "—" ? "Aberto · 24h" : `Aberto · fecha às ${it.closes}`}
                </div>
              </div>
              <div style={{ padding: "12px 14px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14.5, lineHeight: 1.2 }}>{it.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--amber)", fontSize: 11.5, fontWeight: 600 }}>
                    <IconStar width="11" height="11"/>
                    <span>{it.rating}</span>
                  </div>
                </div>
                <div style={{ color: "var(--ink-2)", fontSize: 11.5, marginTop: 3 }}>{it.cat}</div>
              </div>
            </div>
          ))}
          <div className="h-scroll-spacer" style={{ width: 4, flexShrink: 0 }}/>
        </div>
      </div>
    </div>
  )
}
