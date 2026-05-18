"use client"

import { useEffect, useRef } from "react"
import type { Map } from "leaflet"

interface MapaViewProps {
  lat: number
  lng: number
  nome: string
}

export function MapaView({ lat, lng, nome }: MapaViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)

  useEffect(() => {
    if (document.getElementById("leaflet-css")) return
    const link = document.createElement("link")
    link.id = "leaflet-css"
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return

      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:22px;height:22px;
          background:#3b82f6;
          border:3px solid white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 6px rgba(0,0,0,.35);
        "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
        popupAnchor: [0, -22],
      })

      const map = L.map(containerRef.current).setView([lat, lng], 16)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map)

      L.marker([lat, lng], { icon: pinIcon }).addTo(map).bindPopup(nome).openPopup()

      mapRef.current = map
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="h-52 w-full rounded-xl overflow-hidden border border-border" />
}
