"use client"

import dynamic from "next/dynamic"

// ssr: false é obrigatório: o @googlemaps/js-api-loader v2 acessa `window` ao ser
// carregado (Trusted Types) — renderizado no servidor, gera
// "ReferenceError: window is not defined" no log do `next start`.
const MapaView = dynamic(
  () => import("./mapa-view").then((m) => ({ default: m.MapaView })),
  {
    ssr: false,
    loading: () => <div className="h-52 w-full rounded-xl bg-muted animate-pulse" />,
  }
)

export { MapaView }
