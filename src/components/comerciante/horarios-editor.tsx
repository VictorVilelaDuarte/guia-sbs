"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

interface HorarioDia {
  dia: string
  aberto: boolean
  inicio: string
  fim: string
}

function defaultHorarios(): HorarioDia[] {
  return DIAS.map((dia) => ({
    dia,
    aberto: dia !== "Sábado" && dia !== "Domingo",
    inicio: "08:00",
    fim: "18:00",
  }))
}

function parseHorarios(value: string | null): HorarioDia[] {
  if (!value) return defaultHorarios()
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.length === 7) return parsed
  } catch {}
  return defaultHorarios()
}

interface HorariosEditorProps {
  value: string
  onChange: (value: string) => void
}

export function HorariosEditor({ value, onChange }: HorariosEditorProps) {
  const [horarios, setHorarios] = useState<HorarioDia[]>(() => parseHorarios(value || null))

  function update(index: number, changes: Partial<HorarioDia>) {
    const next = horarios.map((h, i) => (i === index ? { ...h, ...changes } : h))
    setHorarios(next)
    onChange(JSON.stringify(next))
  }

  return (
    <div className="rounded-md border border-input divide-y divide-border overflow-hidden">
      {horarios.map((h, i) => (
        <div key={h.dia} className="px-3 py-2.5 bg-background space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          {/* Linha 1 no mobile: nome + toggle */}
          <div className="flex items-center justify-between sm:contents">
            <span className="w-20 shrink-0 text-sm font-medium">{h.dia}</span>

            <button
              type="button"
              onClick={() => update(i, { aberto: !h.aberto })}
              className={cn(
                "w-20 shrink-0 rounded px-2 py-0.5 text-xs font-medium transition-colors",
                h.aberto
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {h.aberto ? "Aberto" : "Fechado"}
            </button>
          </div>

          {/* Linha 2 no mobile: horários */}
          <div className={cn("flex items-center gap-2 sm:flex-1", !h.aberto && "opacity-40")}>
            <Input
              type="time"
              value={h.inicio}
              disabled={!h.aberto}
              onChange={(e) => update(i, { inicio: e.target.value })}
              className="flex-1 sm:w-28 sm:flex-none"
            />
            <span className="text-sm text-muted-foreground shrink-0">até</span>
            <Input
              type="time"
              value={h.fim}
              disabled={!h.aberto}
              onChange={(e) => update(i, { fim: e.target.value })}
              className="flex-1 sm:w-28 sm:flex-none"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
