"use client"

import { useEffect, useRef } from "react"
import { setOptions, importLibrary } from "@googlemaps/js-api-loader"

interface MapaPickerProps {
  lat: number
  lng: number
  onPick: (lat: number, lng: number) => void
}

export function MapaPicker({ lat, lng, onPick }: MapaPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const onPickRef = useRef(onPick)

  useEffect(() => { onPickRef.current = onPick }, [onPick])

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
        zoomControl: true,
        gestureHandling: "cooperative",
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new (google.maps as any).Marker({
        position: { lat, lng },
        map,
        draggable: true,
        cursor: "grab",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
          scale: 10,
        },
      })

      marker.addListener("dragend", () => {
        const pos = marker.getPosition()
        if (pos) onPickRef.current(pos.lat(), pos.lng())
      })

      mapRef.current = map
      markerRef.current = marker
    })

    return () => {
      markerRef.current?.setMap(null)
      markerRef.current = null
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sincroniza posição quando lat/lng mudam (ex: após geocodificação de CEP)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    const pos = { lat, lng }
    markerRef.current.setPosition(pos)
    mapRef.current.setCenter(pos)
  }, [lat, lng])

  return <div ref={containerRef} className="h-64 w-full rounded-lg overflow-hidden border border-input" />
}
