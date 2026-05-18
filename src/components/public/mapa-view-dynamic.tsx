"use client"

import dynamic from "next/dynamic"

const MapaView = dynamic(
  () => import("./mapa-view").then((m) => ({ default: m.MapaView })),
  { ssr: false, loading: () => <div className="h-52 w-full rounded-xl bg-muted animate-pulse" /> }
)

export { MapaView }
