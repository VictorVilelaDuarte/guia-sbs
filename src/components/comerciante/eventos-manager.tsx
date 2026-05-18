"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Plus, Pencil, Trash2, Loader2, ImagePlus, X,
  CalendarDays, MapPin, Link as LinkIcon, Ticket,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface Evento {
  id:          string
  titulo:      string
  descricao:   string | null
  dataInicio:  string | Date
  dataFim:     string | Date | null
  imagem:      string | null
  local:       string | null
  preco:       number | null
  linkExterno: string | null
}

interface FormState {
  titulo:      string
  descricao:   string
  dataInicio:  string
  dataFim:     string
  imagem:      string | null
  local:       string
  preco:       string
  linkExterno: string
}

const EMPTY_FORM: FormState = {
  titulo:      "",
  descricao:   "",
  dataInicio:  "",
  dataFim:     "",
  imagem:      null,
  local:       "",
  preco:       "",
  linkExterno: "",
}

function toDatetimeLocal(date: string | Date | null | undefined): string {
  if (!date) return ""
  const d = new Date(date)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

function formatPreco(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parsePreco(formatted: string): number | null {
  const clean = formatted.replace(/\./g, "").replace(",", ".")
  const num = parseFloat(clean)
  return isNaN(num) ? null : num
}

function formatDataEvento(inicio: string | Date, fim: string | Date | null): string {
  const d1 = new Date(inicio)
  const base = format(d1, "dd 'de' MMM 'às' HH'h'mm", { locale: ptBR })
  if (!fim) return base
  const d2 = new Date(fim)
  const mesmodia = format(d1, "yyyy-MM-dd") === format(d2, "yyyy-MM-dd")
  if (mesmodia) return `${base} – ${format(d2, "HH'h'mm")}`
  return `${base} até ${format(d2, "dd 'de' MMM", { locale: ptBR })}`
}

function isPast(date: string | Date): boolean {
  return new Date(date) < new Date()
}

// ── Dialog ───────────────────────────────────────────────────────────────────

interface EventoDialogProps {
  open:    boolean
  evento:  Evento | null
  onClose: () => void
  onSaved: (e: Evento) => void
}

function EventoDialog({ open, evento, onClose, onSaved }: EventoDialogProps) {
  const isEdicao = !!evento
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setForm(evento ? {
        titulo:      evento.titulo,
        descricao:   evento.descricao ?? "",
        dataInicio:  toDatetimeLocal(evento.dataInicio),
        dataFim:     toDatetimeLocal(evento.dataFim),
        imagem:      evento.imagem,
        local:       evento.local ?? "",
        preco:       evento.preco != null
          ? evento.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
          : "",
        linkExterno: evento.linkExterno ?? "",
      } : EMPTY_FORM)
    } else {
      onClose()
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append("file", file)
    fd.append("tipo", "evento")
    setUploading(true)
    const res = await fetch("/api/comerciante/upload", { method: "POST", body: fd })
    setUploading(false)
    if (!res.ok) { toast.error("Erro ao enviar imagem."); return }
    const { url } = await res.json()
    setForm((f) => ({ ...f, imagem: url }))
    e.target.value = ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.dataInicio) { toast.error("Data de início é obrigatória."); return }

    setSaving(true)
    const payload = {
      titulo:      form.titulo.trim(),
      descricao:   form.descricao.trim() || null,
      dataInicio:  new Date(form.dataInicio).toISOString(),
      dataFim:     form.dataFim ? new Date(form.dataFim).toISOString() : null,
      imagem:      form.imagem,
      local:       form.local.trim() || null,
      preco:       parsePreco(form.preco),
      linkExterno: form.linkExterno.trim() || null,
    }

    const res = await fetch(
      isEdicao ? `/api/comerciante/eventos/${evento.id}` : "/api/comerciante/eventos",
      {
        method: isEdicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = data.detalhes
        ? `Dados inválidos: ${Object.entries(data.detalhes).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join(" | ")}`
        : (data.error ?? "Erro ao salvar evento.")
      toast.error(msg)
      return
    }

    const saved: Evento = await res.json()
    toast.success(isEdicao ? "Evento atualizado." : "Evento criado.")
    onSaved(saved)
    onClose()
  }

  const f = form
  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdicao ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Imagem */}
          <div className="space-y-2">
            <Label>Banner <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <div
              className={cn(
                "relative flex items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/30 overflow-hidden cursor-pointer transition-colors hover:bg-muted/50",
                f.imagem ? "h-36" : "h-24"
              )}
              onClick={() => fileRef.current?.click()}
            >
              {f.imagem ? (
                <>
                  <Image src={f.imagem} alt="Banner" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setForm((p) => ({ ...p, imagem: null })) }}
                    className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs">Adicionar banner</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título <span className="text-destructive">*</span></Label>
            <Input id="titulo" required maxLength={150} placeholder="Nome do evento" value={f.titulo} onChange={set("titulo")} />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Início <span className="text-destructive">*</span></Label>
              <Input id="dataInicio" type="datetime-local" required value={f.dataInicio} onChange={set("dataInicio")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Término <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input id="dataFim" type="datetime-local" value={f.dataFim} onChange={set("dataFim")} min={f.dataInicio} />
            </div>
          </div>

          {/* Local */}
          <div className="space-y-2">
            <Label htmlFor="local">Local <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input id="local" placeholder="Ex: Praça central, Clube Recreativo..." value={f.local} onChange={set("local")} />
          </div>

          {/* Preço + Link */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="preco">Ingresso <span className="text-muted-foreground font-normal">(vazio = gratuito)</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="preco"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="pl-9"
                  value={f.preco}
                  onChange={(e) => setForm((p) => ({ ...p, preco: formatPreco(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkExterno">Link <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input id="linkExterno" type="url" placeholder="https://..." value={f.linkExterno} onChange={set("linkExterno")} />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <textarea
              id="descricao"
              rows={3}
              maxLength={2000}
              placeholder="Detalhes do evento, programação, atrações..."
              value={f.descricao}
              onChange={set("descricao")}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdicao ? "Salvar" : "Criar evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Card do evento ────────────────────────────────────────────────────────────

function EventoCard({
  evento,
  onEdit,
  onDelete,
  removendo,
}: {
  evento: Evento
  onEdit: () => void
  onDelete: () => void
  removendo: boolean
}) {
  const passado = isPast(evento.dataInicio)

  return (
    <div className={cn("rounded-lg border border-input bg-background overflow-hidden", passado && "opacity-60")}>
      {evento.imagem && (
        <div className="relative h-28 w-full">
          <Image src={evento.imagem} alt={evento.titulo} fill className="object-cover" />
          {passado && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-background/80 border border-border">Encerrado</span>
            </div>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{evento.titulo}</p>
          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onDelete} disabled={removendo} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
              {removendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {formatDataEvento(evento.dataInicio, evento.dataFim)}
          </div>
          {evento.local && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {evento.local}
            </div>
          )}
          {evento.linkExterno && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
              <a href={evento.linkExterno} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary transition-colors">
                {evento.linkExterno.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
        </div>

        <span className={cn(
          "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
          evento.preco == null
            ? "bg-green-100 text-green-700"
            : "bg-primary/10 text-primary"
        )}>
          <Ticket className="h-3 w-3" />
          {evento.preco == null
            ? "Gratuito"
            : evento.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>
    </div>
  )
}

// ── Manager principal ─────────────────────────────────────────────────────────

export function EventosManager({ eventosIniciais }: { eventosIniciais: Evento[] }) {
  const [eventos, setEventos] = useState<Evento[]>(eventosIniciais)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [removendoId, setRemovendoId] = useState<string | null>(null)

  const proximos = eventos.filter((e) => !isPast(e.dataInicio))
  const passados = eventos.filter((e) => isPast(e.dataInicio))

  function handleSaved(saved: Evento) {
    setEventos((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [...prev, saved].sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime())
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este evento?")) return
    setRemovendoId(id)
    const res = await fetch(`/api/comerciante/eventos/${id}`, { method: "DELETE" })
    setRemovendoId(null)
    if (!res.ok) { toast.error("Erro ao excluir evento."); return }
    setEventos((prev) => prev.filter((e) => e.id !== id))
    toast.success("Evento excluído.")
  }

  function abrirEdicao(evento: Evento) { setEditando(evento); setDialogOpen(true) }
  function abrirNovo() { setEditando(null); setDialogOpen(true) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {eventos.length === 0 ? "Nenhum evento cadastrado." : `${proximos.length} próximo${proximos.length !== 1 ? "s" : ""} · ${passados.length} encerrado${passados.length !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" onClick={abrirNovo}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo evento
        </Button>
      </div>

      {eventos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border border-dashed border-input text-muted-foreground">
          <CalendarDays className="h-10 w-10 opacity-40" />
          <p className="text-sm">Nenhum evento cadastrado ainda.</p>
          <Button variant="outline" size="sm" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1.5" />
            Criar primeiro evento
          </Button>
        </div>
      ) : (
        <>
          {proximos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Próximos</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {proximos.map((e) => (
                  <EventoCard key={e.id} evento={e} onEdit={() => abrirEdicao(e)} onDelete={() => handleDelete(e.id)} removendo={removendoId === e.id} />
                ))}
              </div>
            </div>
          )}

          {passados.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Encerrados</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {passados.map((e) => (
                  <EventoCard key={e.id} evento={e} onEdit={() => abrirEdicao(e)} onDelete={() => handleDelete(e.id)} removendo={removendoId === e.id} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <EventoDialog open={dialogOpen} evento={editando} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />
    </div>
  )
}
