"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2, Plus, Pencil, Check } from "lucide-react"
import { FEATURES_DISPONIVEIS, type PlanFeatures } from "@/lib/plan-features"

interface Plano {
  id: string
  slug: string
  nome: string
  descricao: string | null
  preco: number
  features: unknown
  ativo: boolean
  ordem: number
}

interface PlanoDialogProps {
  plano?: Plano
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function parseFeatures(raw: unknown): PlanFeatures {
  if (!raw || typeof raw !== "object") return {}
  return raw as PlanFeatures
}

export function PlanoDialog({ plano }: PlanoDialogProps) {
  const router = useRouter()
  const isEdit = !!plano

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [slugManual, setSlugManual] = useState(false)

  const [form, setForm] = useState({
    slug: plano?.slug ?? "",
    nome: plano?.nome ?? "",
    descricao: plano?.descricao ?? "",
    preco: plano?.preco ?? 0,
    ordem: plano?.ordem ?? 0,
    ativo: plano?.ativo ?? true,
  })

  const [features, setFeatures] = useState<PlanFeatures>(parseFeatures(plano?.features))

  function handleNomeChange(nome: string) {
    setForm((f) => ({
      ...f,
      nome,
      slug: slugManual ? f.slug : slugify(nome),
    }))
  }

  function toggleFeature(key: string) {
    setFeatures((f) => ({ ...f, [key]: !f[key as keyof PlanFeatures] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const url = isEdit ? `/api/admin/planos/${plano.id}` : "/api/admin/planos"
    const method = isEdit ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, features }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao salvar plano.")
      return
    }

    toast.success(isEdit ? "Plano atualizado." : "Plano criado.")
    setOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!plano) return
    if (!confirm(`Excluir o plano "${plano.nome}"? Esta ação não pode ser desfeita.`)) return

    const res = await fetch(`/api/admin/planos/${plano.id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao excluir plano.")
      return
    }

    toast.success("Plano excluído.")
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="outline" size="sm" />
          ) : (
            <Button size="sm" />
          )
        }
      >
        {isEdit ? (
          <>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar plano
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Novo plano
          </>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar: ${plano.nome}` : "Criar plano"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="nome">Nome do plano</Label>
              <Input
                id="nome"
                required
                value={form.nome}
                onChange={(e) => handleNomeChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug
                <span className="text-xs text-muted-foreground ml-1">(identificador único)</span>
              </Label>
              <Input
                id="slug"
                required
                disabled={isEdit}
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true)
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }}
                placeholder="ex: premium-plus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preco">Preço (R$/mês)</Label>
              <Input
                id="preco"
                type="number"
                min={0}
                step={0.01}
                required
                value={form.preco}
                onChange={(e) => setForm((f) => ({ ...f, preco: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <textarea
                id="descricao"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recursos inclusos</Label>
            <div className="space-y-2">
              {FEATURES_DISPONIVEIS.map((feature) => {
                const ativo = features[feature.key] ?? false
                return (
                  <button
                    key={feature.key}
                    type="button"
                    onClick={() => toggleFeature(feature.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      ativo
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        ativo
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input bg-background"
                      }`}
                    >
                      {ativo && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{feature.label}</p>
                      <p className="text-xs text-muted-foreground">{feature.descricao}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, ativo: !f.ativo }))}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  form.ativo
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-input bg-background"
                }`}
              >
                {form.ativo && <Check className="h-3 w-3" />}
              </button>
              <div>
                <p className="text-sm font-medium">Plano ativo</p>
                <p className="text-xs text-muted-foreground">Planos inativos não aparecem para novos cadastros</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                Excluir plano
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
