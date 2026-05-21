"use client"

import { useEffect, useRef } from "react"
import type { Map } from "leaflet"
import "leaflet/dist/leaflet.css"

interface MapaViewProps {
  lat: number
  lng: number
  nome: string
  logo?: string | null
}

export function MapaView({ lat, lng, nome, logo }: MapaViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)

  useEffect(() => {
    if (!document.getElementById("leaflet-logo-popup-css")) {
      const style = document.createElement("style")
      style.id = "leaflet-logo-popup-css"
      style.textContent = `
        .leaflet-logo-popup .leaflet-popup-content-wrapper { padding: 1px; border-radius: 10px; overflow: hidden; }
        .leaflet-logo-popup .leaflet-popup-content { margin: 0; font-size: 0; line-height: 0; }
      `
      document.head.appendChild(style)
    }
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

      const popupContent = logo
        ? `<img src="${logo}" alt="${nome}" style="width:72px;height:72px;object-fit:contain;display:block;" />`
        : nome

      L.marker([lat, lng], { icon: pinIcon })
        .addTo(map)
        .bindPopup(popupContent, {
          maxWidth: logo ? 74 : 200,
          className: logo ? "leaflet-logo-popup" : "",
          closeButton: !logo,
        })
        .openPopup()

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
