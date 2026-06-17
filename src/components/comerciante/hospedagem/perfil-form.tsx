"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  COMODIDADES, GRUPO_LABEL, FORMAS_PAGAMENTO, type GrupoComodidade,
} from "@/lib/hospedagem"
import { ComodidadeIcon } from "./comodidade-icons"
import type { HospedagemPerfilData } from "./types"

const GRUPOS: GrupoComodidade[] = ["geral", "quarto", "lazer", "vista", "acessibilidade"]

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between cursor-pointer py-1"
    >
      <span className="text-sm font-medium">{label}</span>
      <div className={cn("h-5 w-9 rounded-full transition-colors relative shrink-0", on ? "bg-primary" : "bg-input")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200", on ? "left-[18px]" : "left-0.5")} />
      </div>
    </button>
  )
}

export function PerfilForm({ perfilInicial }: { perfilInicial: HospedagemPerfilData | null }) {
  const [form, setForm] = useState<HospedagemPerfilData>({
    comodidades: perfilInicial?.comodidades ?? [],
    checkIn: perfilInicial?.checkIn ?? "",
    checkOut: perfilInicial?.checkOut ?? "",
    politicaCancelamento: perfilInicial?.politicaCancelamento ?? "",
    aceitaPets: perfilInicial?.aceitaPets ?? false,
    aceitaCriancas: perfilInicial?.aceitaCriancas ?? true,
    formasPagamento: perfilInicial?.formasPagamento ?? [],
    observacoes: perfilInicial?.observacoes ?? "",
  })
  const [saving, setSaving] = useState(false)

  function toggleComodidade(key: string) {
    setForm((f) => ({
      ...f,
      comodidades: f.comodidades.includes(key)
        ? f.comodidades.filter((k) => k !== key)
        : [...f.comodidades, key],
    }))
  }

  function toggleFormaPagamento(key: string) {
    setForm((f) => ({
      ...f,
      formasPagamento: f.formasPagamento.includes(key)
        ? f.formasPagamento.filter((k) => k !== key)
        : [...f.formasPagamento, key],
    }))
  }

  async function salvar() {
    setSaving(true)
    const res = await fetch("/api/comerciante/hospedagem", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comodidades: form.comodidades,
        checkIn: form.checkIn || null,
        checkOut: form.checkOut || null,
        politicaCancelamento: form.politicaCancelamento?.trim() || null,
        aceitaPets: form.aceitaPets,
        aceitaCriancas: form.aceitaCriancas,
        formasPagamento: form.formasPagamento,
        observacoes: form.observacoes?.trim() || null,
      }),
    })
    setSaving(false)
    if (!res.ok) { toast.error("Erro ao salvar."); return }
    toast.success("Hospedagem atualizada.")
  }

  return (
    <div className="space-y-6">
      {/* Comodidades */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Comodidades</h3>
          <p className="text-xs text-muted-foreground">O que o seu estabelecimento oferece.</p>
        </div>
        {GRUPOS.map((grupo) => {
          const itens = COMODIDADES.filter((c) => c.grupo === grupo)
          return (
            <div key={grupo} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{GRUPO_LABEL[grupo]}</p>
              <div className="flex flex-wrap gap-2">
                {itens.map((c) => {
                  const on = form.comodidades.includes(c.key)
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleComodidade(c.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer",
                        on
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-input text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <ComodidadeIcon keyName={c.key} className="h-3.5 w-3.5" />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Políticas */}
      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="text-sm font-semibold">Políticas e regras</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="checkin" className="text-xs text-muted-foreground">Check-in a partir de</Label>
            <Input id="checkin" type="time" value={form.checkIn ?? ""} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout" className="text-xs text-muted-foreground">Check-out até</Label>
            <Input id="checkout" type="time" value={form.checkOut ?? ""} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Formas de pagamento</Label>
          <div className="flex flex-wrap gap-2">
            {FORMAS_PAGAMENTO.map((fp) => {
              const on = form.formasPagamento.includes(fp.key)
              return (
                <button
                  key={fp.key}
                  type="button"
                  onClick={() => toggleFormaPagamento(fp.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer",
                    on ? "border-primary bg-primary/10 text-primary font-medium" : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  {fp.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-input p-3">
          <Toggle on={form.aceitaPets} onClick={() => setForm((f) => ({ ...f, aceitaPets: !f.aceitaPets }))} label="Aceita pets" />
          <Toggle on={form.aceitaCriancas} onClick={() => setForm((f) => ({ ...f, aceitaCriancas: !f.aceitaCriancas }))} label="Aceita crianças" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cancelamento" className="text-xs text-muted-foreground">Política de cancelamento</Label>
          <textarea
            id="cancelamento"
            rows={2}
            maxLength={2000}
            placeholder="Ex: Cancelamento gratuito até 7 dias antes do check-in."
            value={form.politicaCancelamento ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, politicaCancelamento: e.target.value }))}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="observacoes" className="text-xs text-muted-foreground">Observações <span className="font-normal">(opcional)</span></Label>
          <textarea
            id="observacoes"
            rows={2}
            maxLength={2000}
            placeholder="Outras regras da casa..."
            value={form.observacoes ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar hospedagem
        </Button>
      </div>
    </div>
  )
}
