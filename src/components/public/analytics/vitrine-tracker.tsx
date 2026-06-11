"use client"

import { useEffect } from "react"
import {
  setComercioContext,
  trackViewOnce,
  track,
  resolveOrigem,
} from "@/lib/analytics/track"
import { TIPOS_EVENTO, type TipoEvento } from "@/lib/analytics/types"

interface Props {
  comercioId: string
  // "view" na vitrine, "cardapio_view" / "catalogo_view" nas páginas dedicadas
  pageTipo?: TipoEvento
}

// Componente invisível montado nas páginas públicas do comércio. Responsável
// por: (1) registrar o pageview com origem (dedupe por sessão), (2) setar o
// contexto de comércio para trackCtx, (3) capturar cliques em qualquer
// elemento com data-track="<tipo>" via delegação — assim os CTAs continuam
// Server Components com <a> puros.
export function VitrineTracker({ comercioId, pageTipo = "view" }: Props) {
  useEffect(() => {
    setComercioContext(comercioId)

    const origem = resolveOrigem(
      new URLSearchParams(window.location.search).get("src"),
    )
    trackViewOnce(comercioId, pageTipo, { origem })

    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-track]")
      if (!el) return
      const tipo = el.getAttribute("data-track")
      if (!tipo || !(TIPOS_EVENTO as readonly string[]).includes(tipo)) return
      track(comercioId, tipo as TipoEvento)
    }
    document.addEventListener("click", onClick)

    return () => {
      document.removeEventListener("click", onClick)
      setComercioContext(null)
    }
  }, [comercioId, pageTipo])

  return null
}
