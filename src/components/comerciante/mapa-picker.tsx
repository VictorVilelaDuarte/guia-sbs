"use client"

import { useEffect, useRef } from "react"
import type { Map, Marker } from "leaflet"

interface MapaPickerProps {
  lat: number
  lng: number
  onPick: (lat: number, lng: number) => void
}

export function MapaPicker({ lat, lng, onPick }: MapaPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const onPickRef = useRef(onPick)

  useEffect(() => { onPickRef.current = onPick }, [onPick])

  // Inject Leaflet CSS once
  useEffect(() => {
    if (document.getElementById("leaflet-css")) return
    const link = document.createElement("link")
    link.id = "leaflet-css"
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    document.head.appendChild(link)
  }, [])

  // Initialize map on mount
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
          cursor:grab
        "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      })

      const map = L.map(containerRef.current).setView([lat, lng], 16)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map)

      const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map)

      marker.on("dragend", () => {
        const pos = marker.getLatLng()
        onPickRef.current(pos.lat, pos.lng)
      })

      mapRef.current = map
      markerRef.current = marker
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync marker when lat/lng props change (e.g. after city geocode)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    markerRef.current.setLatLng([lat, lng])
    mapRef.current.setView([lat, lng], mapRef.current.getZoom())
  }, [lat, lng])

  return <div ref={containerRef} className="h-64 w-full rounded-lg overflow-hidden border border-input" />
}
