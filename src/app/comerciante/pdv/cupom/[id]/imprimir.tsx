"use client"

import { useEffect } from "react"

// Abre a impressão do navegador ao carregar (?imprimir=1) e oferece o botão.
export function Imprimir({ automatico }: { automatico: boolean }) {
  useEffect(() => {
    if (!automatico) return
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [automatico])
  return (
    <div className="no-print mx-auto mt-4 flex max-w-[76mm] gap-2">
      <button type="button" onClick={() => window.print()} className="h-10 flex-1 rounded-lg bg-stone-900 text-sm font-semibold text-white">
        Imprimir
      </button>
      <button type="button" onClick={() => window.close()} className="h-10 rounded-lg px-3 text-sm ring-1 ring-stone-300">
        Fechar
      </button>
    </div>
  )
}
