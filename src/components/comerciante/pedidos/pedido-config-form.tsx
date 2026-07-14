"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { FORMAS_PAGAMENTO } from "@/lib/hospedagem"
import type { PedidoConfigData } from "./types"

function Toggle({
  on,
  onClick,
  label,
  hint,
}: {
  on: boolean
  onClick: () => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between gap-3 py-1 text-left"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <div
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          on ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </div>
    </button>
  )
}

function moneyToStr(n: number): string {
  return n ? n.toString().replace(".", ",") : ""
}

export function PedidoConfigForm({ configInicial }: { configInicial: PedidoConfigData | null }) {
  const [aceitaPedidos, setAceitaPedidos] = useState(configInicial?.aceitaPedidos ?? false)
  const [entregaAtiva, setEntregaAtiva] = useState(configInicial?.entregaAtiva ?? true)
  const [retiradaAtiva, setRetiradaAtiva] = useState(configInicial?.retiradaAtiva ?? true)
  const [pedidoMinimo, setPedidoMinimo] = useState(moneyToStr(configInicial?.pedidoMinimo ?? 0))
  const [tempoPreparo, setTempoPreparo] = useState(
    configInicial?.tempoPreparoMin?.toString() ?? "",
  )
  const [formasPagamento, setFormasPagamento] = useState<string[]>(
    configInicial?.formasPagamento ?? [],
  )
  const [saving, setSaving] = useState(false)

  function toggleForma(key: string) {
    setFormasPagamento((f) =>
      f.includes(key) ? f.filter((k) => k !== key) : [...f, key],
    )
  }

  async function salvar() {
    if (aceitaPedidos && formasPagamento.length === 0) {
      toast.error("Selecione ao menos uma forma de pagamento.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/comerciante/pedido-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aceitaPedidos,
          entregaAtiva,
          retiradaAtiva,
          pedidoMinimo: parseFloat(pedidoMinimo.replace(",", ".")) || 0,
          tempoPreparoMin: tempoPreparo ? parseInt(tempoPreparo, 10) : null,
          formasPagamento,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Erro ao salvar.")
        return
      }
      toast.success("Configuração salva.")
    } catch {
      toast.error("Falha de conexão.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <Toggle
          on={aceitaPedidos}
          onClick={() => setAceitaPedidos((v) => !v)}
          label="Aceitar pedidos online"
          hint="Liga o botão de pedido no seu cardápio. Desligue para pausar (ex: fim do expediente)."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Modalidades</Label>
        <div className="space-y-1.5">
          <Toggle on={entregaAtiva} onClick={() => setEntregaAtiva((v) => !v)} label="Entrega" />
          <Toggle on={retiradaAtiva} onClick={() => setRetiradaAtiva((v) => !v)} label="Retirada na loja" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="minimo">Pedido mínimo (R$)</Label>
          <Input
            id="minimo"
            inputMode="decimal"
            value={pedidoMinimo}
            onChange={(e) => setPedidoMinimo(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preparo">Tempo de preparo (min)</Label>
          <Input
            id="preparo"
            inputMode="numeric"
            value={tempoPreparo}
            onChange={(e) => setTempoPreparo(e.target.value)}
            placeholder="40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Formas de pagamento aceitas</Label>
        <div className="flex flex-wrap gap-2">
          {FORMAS_PAGAMENTO.map((fp) => {
            const on = formasPagamento.includes(fp.key)
            return (
              <button
                key={fp.key}
                type="button"
                onClick={() => toggleForma(fp.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30",
                )}
              >
                {fp.label}
              </button>
            )
          })}
        </div>
      </div>

      <Button onClick={salvar} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar configuração
      </Button>
    </div>
  )
}
