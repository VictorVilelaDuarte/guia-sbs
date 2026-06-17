"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Loader2, BedDouble, Users, Ruler } from "lucide-react"
import { cn } from "@/lib/utils"
import { displayPreco } from "@/components/comerciante/cardapio/utils"
import { QuartoDialog } from "./quarto-dialog"
import type { TipoQuartoData } from "./types"

export function QuartosManager({
  quartosIniciais,
  limite,
}: {
  quartosIniciais: TipoQuartoData[]
  limite?: number
}) {
  const [quartos, setQuartos] = useState<TipoQuartoData[]>(quartosIniciais)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<TipoQuartoData | null>(null)
  const [removendoId, setRemovendoId] = useState<string | null>(null)

  const atingiuLimite = limite !== undefined && quartos.length >= limite

  function abrirNovo() {
    if (atingiuLimite) {
      toast.warning(`Limite de ${limite} quartos atingido. Faça upgrade para o plano Premium.`)
      return
    }
    setEditando(null)
    setDialogOpen(true)
  }

  function handleSaved(saved: TipoQuartoData) {
    setQuartos((prev) => {
      const idx = prev.findIndex((q) => q.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este quarto?")) return
    setRemovendoId(id)
    const res = await fetch(`/api/comerciante/hospedagem/quartos/${id}`, { method: "DELETE" })
    setRemovendoId(null)
    if (!res.ok) { toast.error("Erro ao excluir quarto."); return }
    setQuartos((prev) => prev.filter((q) => q.id !== id))
    toast.success("Quarto excluído.")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Tipos de quarto</h3>
          <p className="text-xs text-muted-foreground">
            {quartos.length === 0
              ? "Cadastre os quartos/acomodações do seu estabelecimento."
              : `${quartos.length}${limite !== undefined ? `/${limite}` : ""} quarto${quartos.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button size="sm" onClick={abrirNovo} disabled={atingiuLimite}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo quarto
        </Button>
      </div>

      {atingiuLimite && (
        <p className="text-xs text-amber-600 font-medium">
          Limite de {limite} quartos atingido. Faça upgrade para o plano Premium para adicionar mais.
        </p>
      )}

      {quartos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border border-dashed border-input text-muted-foreground">
          <BedDouble className="h-10 w-10 opacity-40" />
          <p className="text-sm">Adicione quartos para exibir na sua vitrine.</p>
          <Button variant="outline" size="sm" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar primeiro quarto
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {quartos.map((q) => (
            <div key={q.id} className={cn("group relative flex gap-3 rounded-lg border border-input bg-background p-3", !q.ativo && "opacity-60")}>
              <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
                {q.fotos[0] ? (
                  <Image src={q.fotos[0]} alt={q.nome} fill className="object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <BedDouble className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{q.nome}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                  {q.capacidade != null && <span className="inline-flex items-center gap-0.5"><Users className="h-3 w-3" />{q.capacidade}</span>}
                  {q.camas && <span className="inline-flex items-center gap-0.5"><BedDouble className="h-3 w-3" />{q.camas}</span>}
                  {q.tamanhoM2 != null && <span className="inline-flex items-center gap-0.5"><Ruler className="h-3 w-3" />{q.tamanhoM2} m²</span>}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-primary">
                    {q.precoNoite != null ? `${displayPreco(q.precoNoite)}/noite` : "Consultar valores"}
                  </span>
                  {!q.ativo && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Oculto</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <button type="button" onClick={() => { setEditando(q); setDialogOpen(true) }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" aria-label="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => handleDelete(q.id)} disabled={removendoId === q.id}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 cursor-pointer" aria-label="Excluir">
                  {removendoId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <QuartoDialog open={dialogOpen} quarto={editando} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />
    </div>
  )
}
