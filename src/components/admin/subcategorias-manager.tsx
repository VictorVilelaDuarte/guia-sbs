"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Loader2, EyeOff, Eye } from "lucide-react"
import type { Categoria } from "@prisma/client"

interface Subcategoria {
  id: string
  nome: string
  categoria: Categoria
  ativo: boolean
  ordem: number
  _count: { comercios: number }
}

interface Props {
  agrupadas: Record<string, Subcategoria[]>
  categoriaLabels: Record<Categoria, string>
}

const CATEGORIAS: Categoria[] = [
  "ALIMENTACAO", "HOSPEDAGEM", "TURISMO", "SERVICO", "COMERCIO", "ENTRETENIMENTO",
]

export function SubcategoriasManager({ agrupadas, categoriaLabels }: Props) {
  const router = useRouter()
  const [criandoNa, setCriandoNa] = useState<Categoria | null>(null)
  const [editando, setEditando] = useState<Subcategoria | null>(null)
  const [loading, setLoading] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [editNome, setEditNome] = useState("")

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!criandoNa) return
    setLoading(true)
    const res = await fetch("/api/admin/subcategorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome, categoria: criandoNa }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao criar subcategoria.")
      return
    }
    toast.success("Subcategoria criada.")
    setCriandoNa(null)
    setNovoNome("")
    router.refresh()
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setLoading(true)
    const res = await fetch(`/api/admin/subcategorias/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: editNome }),
    })
    setLoading(false)
    if (!res.ok) { toast.error("Erro ao salvar."); return }
    toast.success("Subcategoria atualizada.")
    setEditando(null)
    router.refresh()
  }

  async function handleToggleAtivo(sub: Subcategoria) {
    const res = await fetch(`/api/admin/subcategorias/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !sub.ativo }),
    })
    if (!res.ok) { toast.error("Erro ao atualizar."); return }
    toast.success(sub.ativo ? "Subcategoria desativada." : "Subcategoria ativada.")
    router.refresh()
  }

  async function handleExcluir(sub: Subcategoria) {
    if (!confirm(`Excluir "${sub.nome}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/subcategorias/${sub.id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao excluir.")
      return
    }
    toast.success("Subcategoria excluída.")
    router.refresh()
  }

  return (
    <>
      <div className="space-y-4">
        {CATEGORIAS.map((cat) => {
          const subs = agrupadas[cat] ?? []
          return (
            <div key={cat} className="border rounded-lg overflow-hidden bg-background">
              <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{categoriaLabels[cat]}</span>
                  <span className="text-xs text-muted-foreground">
                    {subs.length} subcategoria{subs.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setCriandoNa(cat); setNovoNome("") }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>

              {subs.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-4">
                  Nenhuma subcategoria cadastrada.
                </p>
              ) : (
                <div className="divide-y">
                  {subs.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${!sub.ativo ? "text-muted-foreground line-through" : ""}`}>
                          {sub.nome}
                        </span>
                        {!sub.ativo && (
                          <Badge variant="outline" className="text-xs py-0">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                        {sub._count.comercios > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {sub._count.comercios} comércio{sub._count.comercios !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => { setEditando(sub); setEditNome(sub.nome) }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground"
                          onClick={() => handleToggleAtivo(sub)}
                          title={sub.ativo ? "Desativar" : "Ativar"}
                        >
                          {sub.ativo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleExcluir(sub)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dialog criar — categoria já definida pelo botão clicado */}
      <Dialog open={!!criandoNa} onOpenChange={(v) => !v && setCriandoNa(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Nova subcategoria em{" "}
              <span className="text-muted-foreground font-normal">
                {criandoNa ? categoriaLabels[criandoNa] : ""}
              </span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="novo-nome">Nome</Label>
              <Input
                id="novo-nome"
                required
                autoFocus
                placeholder="Ex: Cafeteria"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCriandoNa(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog editar */}
      <Dialog open={!!editando} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar subcategoria</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditar} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                required
                autoFocus
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
