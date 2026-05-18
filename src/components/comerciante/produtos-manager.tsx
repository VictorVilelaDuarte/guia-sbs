"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Plus, Pencil, Trash2, Loader2, ImagePlus, X,
  PackageOpen, Eye, EyeOff,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Produto {
  id: string
  titulo: string
  descricao: string | null
  preco: number | null
  imagem: string | null
  disponivel: boolean
  ordem: number
}

interface FormState {
  titulo: string
  descricao: string
  preco: string
  imagem: string | null
  disponivel: boolean
}

const EMPTY_FORM: FormState = {
  titulo: "",
  descricao: "",
  preco: "",
  imagem: null,
  disponivel: true,
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

function displayPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// ── Dialog de criação / edição ──────────────────────────────────────────────

interface ProdutoDialogProps {
  open: boolean
  produto: Produto | null
  onClose: () => void
  onSaved: (produto: Produto) => void
}

function ProdutoDialog({ open, produto, onClose, onSaved }: ProdutoDialogProps) {
  const isEdicao = !!produto
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sincroniza form ao abrir
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setForm(
        produto
          ? {
              titulo: produto.titulo,
              descricao: produto.descricao ?? "",
              preco: produto.preco != null
                ? produto.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                : "",
              imagem: produto.imagem,
              disponivel: produto.disponivel,
            }
          : EMPTY_FORM
      )
    } else {
      onClose()
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const fd = new FormData()
    fd.append("file", file)
    fd.append("tipo", "produto")

    setUploading(true)
    const res = await fetch("/api/comerciante/upload", { method: "POST", body: fd })
    setUploading(false)

    if (!res.ok) {
      toast.error("Erro ao enviar imagem.")
      return
    }

    const { url } = await res.json()
    setForm((f) => ({ ...f, imagem: url }))
    e.target.value = ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      preco: parsePreco(form.preco),
      imagem: form.imagem,
      disponivel: form.disponivel,
    }

    const res = await fetch(
      isEdicao ? `/api/comerciante/produtos/${produto.id}` : "/api/comerciante/produtos",
      {
        method: isEdicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )

    setSaving(false)

    if (!res.ok) {
      toast.error("Erro ao salvar produto.")
      return
    }

    const saved: Produto = await res.json()
    toast.success(isEdicao ? "Produto atualizado." : "Produto criado.")
    onSaved(saved)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdicao ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Imagem */}
          <div className="space-y-2">
            <Label>Imagem <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <div
              className={cn(
                "relative flex items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/30 overflow-hidden cursor-pointer transition-colors hover:bg-muted/50",
                form.imagem ? "h-40" : "h-28"
              )}
              onClick={() => fileRef.current?.click()}
            >
              {form.imagem ? (
                <>
                  <Image src={form.imagem} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, imagem: null })) }}
                    className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    aria-label="Remover imagem"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs">Clique para adicionar imagem</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titulo"
              required
              maxLength={120}
              placeholder="Ex: Bolo de chocolate, Corte de cabelo..."
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">
              Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <textarea
              id="descricao"
              rows={3}
              maxLength={1000}
              placeholder="Ingredientes, detalhes, tamanhos disponíveis..."
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {/* Preço + Disponível */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preco">
                Preço <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="preco"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="pl-9"
                  value={form.preco}
                  onChange={(e) => {
                    const formatted = formatPreco(e.target.value)
                    setForm((f) => ({ ...f, preco: formatted }))
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Disponível</Label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, disponivel: !f.disponivel }))}
                className={cn(
                  "w-full h-9 rounded-md px-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border",
                  form.disponivel
                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    : "bg-muted border-input text-muted-foreground hover:bg-muted/70"
                )}
              >
                {form.disponivel
                  ? <><Eye className="h-3.5 w-3.5" /> Visível</>
                  : <><EyeOff className="h-3.5 w-3.5" /> Oculto</>
                }
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdicao ? "Salvar" : "Criar produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Manager principal ────────────────────────────────────────────────────────

export function ProdutosManager({ produtosIniciais }: { produtosIniciais: Produto[] }) {
  const [produtos, setProdutos] = useState<Produto[]>(produtosIniciais)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [removendoId, setRemovendoId] = useState<string | null>(null)

  function abrirNovo() {
    setEditando(null)
    setDialogOpen(true)
  }

  function abrirEdicao(produto: Produto) {
    setEditando(produto)
    setDialogOpen(true)
  }

  function handleSaved(saved: Produto) {
    setProdutos((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
  }

  async function toggleDisponivel(produto: Produto) {
    const res = await fetch(`/api/comerciante/produtos/${produto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disponivel: !produto.disponivel }),
    })
    if (!res.ok) { toast.error("Erro ao atualizar."); return }
    const updated: Produto = await res.json()
    setProdutos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este produto?")) return
    setRemovendoId(id)
    const res = await fetch(`/api/comerciante/produtos/${id}`, { method: "DELETE" })
    setRemovendoId(null)
    if (!res.ok) { toast.error("Erro ao excluir produto."); return }
    setProdutos((prev) => prev.filter((p) => p.id !== id))
    toast.success("Produto excluído.")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {produtos.length === 0
            ? "Nenhum produto cadastrado."
            : `${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"}`}
        </p>
        <Button size="sm" onClick={abrirNovo}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo produto
        </Button>
      </div>

      {produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border border-dashed border-input text-muted-foreground">
          <PackageOpen className="h-10 w-10 opacity-40" />
          <p className="text-sm">Adicione produtos ou serviços para exibir no seu perfil.</p>
          <Button variant="outline" size="sm" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar primeiro produto
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {produtos.map((p) => (
            <div
              key={p.id}
              className={cn(
                "group relative flex gap-3 rounded-lg border border-input bg-background p-3 transition-opacity",
                !p.disponivel && "opacity-60"
              )}
            >
              {/* Imagem */}
              <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
                {p.imagem ? (
                  <Image src={p.imagem} alt={p.titulo} fill className="object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <PackageOpen className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.titulo}</p>
                {p.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.descricao}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {p.preco != null && (
                    <span className="text-xs font-semibold text-primary">{displayPreco(p.preco)}</span>
                  )}
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    p.disponivel
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {p.disponivel ? "Visível" : "Oculto"}
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => abrirEdicao(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleDisponivel(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={p.disponivel ? "Ocultar" : "Mostrar"}
                >
                  {p.disponivel ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={removendoId === p.id}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  aria-label="Excluir"
                >
                  {removendoId === p.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProdutoDialog
        open={dialogOpen}
        produto={editando}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
