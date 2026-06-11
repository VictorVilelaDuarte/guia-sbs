"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { track } from "@/lib/analytics/track"
import type { TipoEvento } from "@/lib/analytics/types"

interface Props {
  comercioId: string
  tipo: TipoEvento
  meta?: Record<string, string | number>
  children: ReactNode
}

// Registra um evento quando o conteúdo entra na viewport (50% visível, uma
// única vez). Usado para impressões de eventos na vitrine.
export function TrackImpression({ comercioId, tipo, meta, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const fired = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (fired.current || !entries.some((e) => e.isIntersecting)) return
        fired.current = true
        track(comercioId, tipo, { meta })
        io.disconnect()
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
    // meta é objeto novo a cada render do pai — intencionalmente fora das deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comercioId, tipo])

  return <div ref={ref}>{children}</div>
}
