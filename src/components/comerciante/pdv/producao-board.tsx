"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChefHat, Clock } from "lucide-react"
import { toast } from "sonner"
import type { RodadaProducao } from "@/lib/gestao/comandas"
import { rotuloMesa } from "@/lib/gestao/mesas-link"
import { beep } from "@/components/comerciante/pedidos/beep"
import { cn } from "@/lib/utils"

const POLL_MS = 10000

function minutos(iso: string, agora: number) {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000))
}

// Rodadas das comandas esperando preparo, da mais antiga para a mais nova.
// Atualiza sozinho e apita quando chega rodada nova.
export function ProducaoBoard({ iniciais }: { iniciais: RodadaProducao[] }) {
  const [rodadas, setRodadas] = useState(iniciais)
  const [agora, setAgora] = useState(() => Date.now())
  const conhecidas = useRef(new Set(iniciais.map((r) => `${r.pedidoId}:${r.rodada}`)))

  useEffect(() => {
    const t = setInterval(async () => {
      setAgora(Date.now())
      const res = await fetch("/api/comerciante/gestao/producao", { cache: "no-store" }).catch(() => null)
      if (!res?.ok) return
      const lista: RodadaProducao[] = await res.json()
      const novas = lista.filter((r) => !conhecidas.current.has(`${r.pedidoId}:${r.rodada}`))
      if (novas.length > 0) beep()
      conhecidas.current = new Set(lista.map((r) => `${r.pedidoId}:${r.rodada}`))
      setRodadas(lista)
    }, POLL_MS)
    return () => clearInterval(t)
  }, [])

  async function pronto(r: RodadaProducao) {
    const res = await fetch("/api/comerciante/gestao/producao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedidoId: r.pedidoId, rodada: r.rodada }),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (!res?.ok) return toast.error(data?.error ?? "Não foi possível marcar como pronto.")
    setRodadas((rs) => rs.filter((x) => !(x.pedidoId === r.pedidoId && x.rodada === r.rodada)))
    toast.success(`${r.mesa ? rotuloMesa(r.mesa) : r.clienteNome} — rodada ${r.rodada} pronta.`)
  }

  if (rodadas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-card py-16 text-center ring-1 ring-foreground/10">
        <ChefHat className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Nada para preparar agora</p>
        <p className="text-sm text-muted-foreground">As rodadas enviadas pelas comandas do PDV aparecem aqui.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rodadas.map((r) => {
        const min = minutos(r.enviadoEm, agora)
        return (
          <div key={`${r.pedidoId}:${r.rodada}`} className="flex flex-col rounded-xl bg-background p-4 ring-1 ring-foreground/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold">{r.mesa ? rotuloMesa(r.mesa) : r.clienteNome}</p>
                <p className="text-xs text-muted-foreground">#{r.numero} · rodada {r.rodada}</p>
              </div>
              <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", min >= 20 ? "bg-rose-100 text-rose-700" : min >= 10 ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-700")}>
                <Clock className="h-3 w-3" /> {min} min
              </span>
            </div>
            <ul className="my-3 flex-1 space-y-1.5">
              {r.itens.map((i) => (
                <li key={i.id} className="text-sm">
                  <span className="font-bold tabular-nums">{i.quantidade}×</span> {i.titulo}
                  {i.variacaoNome && <span className="text-muted-foreground"> ({i.variacaoNome})</span>}
                  {i.complementos.length > 0 && (
                    <span className="block pl-5 text-xs text-sky-700">
                      + {i.complementos.map((c) => (c.quantidade > 1 ? `${c.quantidade}× ${c.nome}` : c.nome)).join(", ")}
                    </span>
                  )}
                  {i.observacao && <span className="block pl-5 text-xs font-medium text-amber-700">↳ {i.observacao}</span>}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => pronto(r)} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white">
              <Check className="h-4 w-4" /> Pronto
            </button>
          </div>
        )
      })}
    </div>
  )
}
