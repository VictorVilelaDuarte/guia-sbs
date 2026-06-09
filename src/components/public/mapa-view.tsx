"use client"

import { useEffect, useRef } from "react"
import { setOptions, importLibrary } from "@googlemaps/js-api-loader"

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5ede0" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#3d2b1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fdf5e9" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9ab8c" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#d8e8c0" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#ede5d4" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#c5dba8", visibility: "on" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7a5c3a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f4e4c0" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#edd090" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d4a840" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#a8cfe0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5c8fa8" }] },
]

interface MapaViewProps {
  lat: number
  lng: number
  nome: string
  logo?: string | null
}

export function MapaView({ lat, lng, nome, logo }: MapaViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return

    setOptions({ key: apiKey, v: "weekly" })
    importLibrary("maps").then(({ Map }) => {
      if (!containerRef.current || mapRef.current) return

      const map = new Map(containerRef.current, {
        center: { lat, lng },
        zoom: 16,
        disableDefaultUI: true,
        gestureHandling: "none",
        keyboardShortcuts: false,
        styles: MAP_STYLE,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new (google.maps as any).Marker({
        position: { lat, lng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
          scale: 10,
        },
      })

      const infoContent = logo
        ? `<img src="${logo}" alt="${nome}" style="width:72px;height:72px;object-fit:contain;display:block;border-radius:8px;" />`
        : `<div style="font-size:13px;font-weight:600;padding:4px 2px;font-family:inherit;">${nome}</div>`

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent,
        disableAutoPan: true,
      })
      infoWindow.open(map, marker)

      mapRef.current = map
    })

    return () => {
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="h-52 w-full rounded-xl overflow-hidden border border-border" />
}
