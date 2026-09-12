"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2, ImagePlus, X, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { COMODIDADES, GRUPO_LABEL, type GrupoComodidade } from "@/lib/hospedagem"
import { formatPreco, parsePreco } from "@/components/comerciante/cardapio/utils"
import { ComodidadeIcon } from "./comodidade-icons"
import type { TipoQuartoData } from "./types"

const MAX_FOTOS = 8
const GRUPOS: GrupoComodidade[] = ["geral", "quarto", "lazer", "vista", "acessibilidade"]

interface FormState {
  nome: string
  descricao: string
  precoNoite: string
  capacidade: string
  camas: string
  tamanhoM2: string
  comodidades: string[]
  fotos: string[]
  ativo: boolean
}

const EMPTY: FormState = {
  nome: "", descricao: "", precoNoite: "", capacidade: "", camas: "",
  tamanhoM2: "", comodidades: [], fotos: [], ativo: true,
}

export function QuartoDialog({
  open, quarto, onClose, onSaved,
}: {
  open: boolean
  quarto: TipoQuartoData | null
  onClose: () => void
  onSaved: (q: TipoQuartoData) => void
}) {
  const isEdicao = !!quarto
  const [form, setForm] = useState<FormState>(EMPTY)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const slotsRestantes = MAX_FOTOS - form.fotos.length

  useEffect(() => {
    if (!open) return
    if (quarto) {
      setForm({
        nome: quarto.nome,
        descricao: quarto.descricao ?? "",
        precoNoite: quarto.precoNoite != null ? quarto.precoNoite.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
        capacidade: quarto.capacidade != null ? String(quarto.capacidade) : "",
        camas: quarto.camas ?? "",
        tamanhoM2: quarto.tamanhoM2 != null ? String(quarto.tamanhoM2) : "",
        comodidades: quarto.comodidades,
        fotos: quarto.fotos,
        ativo: quarto.ativo,
      })
    } else {
      setForm(EMPTY)
    }
  }, [open, quarto])

  function toggleComodidade(key: string) {
    setForm((f) => ({
      ...f,
      comodidades: f.comodidades.includes(key) ? f.comodidades.filter((k) => k !== key) : [...f.comodidades, key],
    }))
  }

  async function processFiles(rawFiles: File[]) {
    const slots = MAX_FOTOS - form.fotos.length
    if (slots <= 0) return
    const toProcess = rawFiles.slice(0, slots)
    setUploading(true)
    const uploaded: string[] = []
    for (const rawFile of toProcess) {
      let file = rawFile
      const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")
      if (isHeic) {
        try {
          // import dinâmico: heic2any acessa window na carga do módulo e quebra o SSR
          const { default: heic2any } = await import("heic2any")
          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 })
          const blob = Array.isArray(converted) ? converted[0] : converted
          file = new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" })
        } catch {
          toast.error(`Não foi possível converter "${file.name}".`)
          continue
        }
      }
      const fd = new FormData()
      fd.append("file", file)
      fd.append("tipo", "quarto")
      const res = await fetch("/api/comerciante/upload", { method: "POST", body: fd })
      if (!res.ok) { toast.error(`Erro ao enviar "${file.name}".`); continue }
      const { url } = await res.json()
      uploaded.push(url)
    }
    setUploading(false)
    if (uploaded.length > 0) setForm((f) => ({ ...f, fotos: [...f.fotos, ...uploaded] }))
    if (rawFiles.length > slots) {
      toast.warning(`Limite de ${MAX_FOTOS} fotos atingido. ${rawFiles.length - slots} ignorada(s).`)
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length > 0) await processFiles(files)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name))
    if (files.length > 0) processFiles(files)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { toast.error("Informe o nome do quarto."); return }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      precoNoite: parsePreco(form.precoNoite) ?? null,
      capacidade: form.capacidade ? Number(form.capacidade) : null,
      camas: form.camas.trim() || null,
      tamanhoM2: form.tamanhoM2 ? Number(form.tamanhoM2.replace(",", ".")) : null,
      comodidades: form.comodidades,
      fotos: form.fotos,
      ativo: form.ativo,
    }
    const res = await fetch(
      isEdicao ? `/api/comerciante/hospedagem/quartos/${quarto.id}` : "/api/comerciante/hospedagem/quartos",
      { method: isEdicao ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    )
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => null)
      toast.error(j?.error ?? "Erro ao salvar quarto.")
      return
    }
    const saved: TipoQuartoData = await res.json()
    toast.success(isEdicao ? "Quarto atualizado." : "Quarto criado.")
    onSaved(saved)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdicao ? "Editar quarto" : "Novo quarto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Fotos */}
          <div className="space-y-2">
            <Label>Fotos <span className="text-muted-foreground font-normal">(até {MAX_FOTOS})</span></Label>
            <div
              className={cn("flex gap-2 flex-wrap rounded-lg border-2 border-dashed p-1.5 transition-colors", isDragging ? "border-primary bg-primary/5" : "border-transparent")}
              onDragOver={(e) => { e.preventDefault(); if (form.fotos.length < MAX_FOTOS) setIsDragging(true) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
              onDrop={handleDrop}
            >
              {form.fotos.map((url, i) => (
                <div key={i} className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden bg-muted">
                  <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, fotos: f.fotos.filter((_, idx) => idx !== i) }))}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer" aria-label="Remover foto">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {form.fotos.length < MAX_FOTOS && (
                <div
                  className={cn("flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed cursor-pointer transition-colors", isDragging ? "border-primary bg-primary/10 text-primary" : "border-input bg-muted/30 hover:bg-muted/50 text-muted-foreground")}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px] leading-tight text-center px-1">
                        {slotsRestantes < MAX_FOTOS ? `${slotsRestantes} restante${slotsRestantes !== 1 ? "s" : ""}` : "Adicionar"}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" multiple={slotsRestantes > 1} accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={handleImageChange} />
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome-quarto">Nome <span className="text-destructive">*</span></Label>
            <Input id="nome-quarto" required maxLength={120} placeholder="Ex: Suíte Master, Chalé Família..." value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="desc-quarto">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <textarea id="desc-quarto" rows={3} maxLength={2000} placeholder="O que torna esse quarto especial..." value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>

          {/* Diária + capacidade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Diária <span className="font-normal">(opcional)</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input inputMode="numeric" placeholder="0,00" className="pl-9" value={form.precoNoite} onChange={(e) => setForm((f) => ({ ...f, precoNoite: formatPreco(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Capacidade <span className="font-normal">(hóspedes)</span></Label>
              <Input inputMode="numeric" placeholder="2" value={form.capacidade} onChange={(e) => setForm((f) => ({ ...f, capacidade: e.target.value.replace(/\D/g, "") }))} />
            </div>
          </div>

          {/* Camas + tamanho */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Camas <span className="font-normal">(opcional)</span></Label>
              <Input maxLength={120} placeholder="1 casal + 1 solteiro" value={form.camas} onChange={(e) => setForm((f) => ({ ...f, camas: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tamanho m² <span className="font-normal">(opcional)</span></Label>
              <Input inputMode="numeric" placeholder="25" value={form.tamanhoM2} onChange={(e) => setForm((f) => ({ ...f, tamanhoM2: e.target.value.replace(/[^\d,]/g, "") }))} />
            </div>
          </div>

          {/* Comodidades do quarto */}
          <div className="space-y-2">
            <Label>Comodidades do quarto</Label>
            {GRUPOS.map((grupo) => {
              const itens = COMODIDADES.filter((c) => c.grupo === grupo)
              return (
                <div key={grupo} className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{GRUPO_LABEL[grupo]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {itens.map((c) => {
                      const on = form.comodidades.includes(c.key)
                      return (
                        <button key={c.key} type="button" onClick={() => toggleComodidade(c.key)}
                          className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer", on ? "border-primary bg-primary/10 text-primary font-medium" : "border-input text-muted-foreground hover:bg-muted")}>
                          <ComodidadeIcon keyName={c.key} className="h-3 w-3" />
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Disponível */}
          <button type="button" onClick={() => setForm((f) => ({ ...f, ativo: !f.ativo }))}
            className={cn("w-full h-9 rounded-md px-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border cursor-pointer", form.ativo ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" : "bg-muted border-input text-muted-foreground hover:bg-muted/70")}>
            {form.ativo ? <><Eye className="h-3.5 w-3.5" /> Visível na vitrine</> : <><EyeOff className="h-3.5 w-3.5" /> Oculto</>}
          </button>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdicao ? "Salvar" : "Criar quarto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
