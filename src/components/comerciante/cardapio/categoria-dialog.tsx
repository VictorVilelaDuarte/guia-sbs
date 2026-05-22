"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { CardapioCategoria } from "./types"

interface CategoriaDialogProps {
  open: boolean
  categoria: CardapioCategoria | null
  onClose: () => void
  onSaved: (cat: CardapioCategoria) => void
}

export function CategoriaDialog({ open, categoria, onClose, onSaved }: CategoriaDialogProps) {
  const isEdicao = !!categoria
  const [nome, setNome] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setNome(categoria?.nome ?? "")
  }, [open, categoria])

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch(
      isEdicao ? `/api/comerciante/cardapio/categorias/${categoria.id}` : "/api/comerciante/cardapio/categorias",
      {
        method: isEdicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() }),
      }
    )

    setSaving(false)
    if (!res.ok) { toast.error("Erro ao salvar categoria."); return }

    const saved: CardapioCategoria = await res.json()
    toast.success(isEdicao ? "Categoria atualizada." : "Categoria criada.")
    onSaved(saved)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdicao ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="nome-cat">Nome <span className="text-destructive">*</span></Label>
            <Input
              id="nome-cat"
              required
              maxLength={80}
              placeholder="Ex: Entradas, Bebidas, Sobremesas..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdicao ? "Salvar" : "Criar categoria"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
