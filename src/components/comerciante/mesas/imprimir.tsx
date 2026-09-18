"use client"

import { Printer } from "lucide-react"

export function Imprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
    >
      <Printer className="h-4 w-4" /> Imprimir
    </button>
  )
}
