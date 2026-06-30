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

interface Bairro {
  id: string
  nome: string
  cidade: string
  uf: string
  ativo: boolean
  ordem: number
  _count: { zonas: number }
}

interface Props {
  agrupados: Record<string, Bairro[]>
}

interface FormState {
  nome: string
  cidade: string
  uf: string
}

const VAZIO: FormState = { nome: "", cidade: "São Bento do Sapucaí", uf: "SP" }

export function BairrosManager({ agrupados }: Props) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<Bairro | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormState>(VAZIO)

  const cidades = Object.keys(agrupados).sort()

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/admin/bairros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao criar bairro.")
      return
    }
    toast.success("Bairro criado.")
    setCriando(false)
    setForm(VAZIO)
    router.refresh()
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setLoading(true)
    const res = await fetch(`/api/admin/bairros/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao salvar.")
      return
    }
    toast.success("Bairro atualizado.")
    setEditando(null)
    router.refresh()
  }

  async function handleToggleAtivo(b: Bairro) {
    const res = await fetch(`/api/admin/bairros/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !b.ativo }),
    })
    if (!res.ok) { toast.error("Erro ao atualizar."); return }
    toast.success(b.ativo ? "Bairro desativado." : "Bairro ativado.")
    router.refresh()
  }

  async function handleExcluir(b: Bairro) {
    const aviso = b._count.zonas > 0
      ? `"${b.nome}" é usado por ${b._count.zonas} loja(s). Excluir do catálogo não remove as áreas já configuradas — elas só deixam de referenciar o catálogo. Continuar?`
      : `Excluir "${b.nome}"? Esta ação não pode ser desfeita.`
    if (!confirm(aviso)) return
    const res = await fetch(`/api/admin/bairros/${b.id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao excluir.")
      return
    }
    toast.success("Bairro excluído.")
    router.refresh()
  }

  function abrirEdicao(b: Bairro) {
    setForm({ nome: b.nome, cidade: b.cidade, uf: b.uf })
    setEditando(b)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => { setForm(VAZIO); setCriando(true) }}>
          <Plus className="h-4 w-4" />
          Novo bairro
        </Button>
      </div>

      <div className="space-y-4">
        {cidades.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum bairro cadastrado.</p>
        )}
        {cidades.map((cidade) => {
          const lista = agrupados[cidade]
          return (
            <div key={cidade} className="border rounded-lg overflow-hidden bg-background">
              <div className="px-4 py-3 bg-muted/40 border-b flex items-center gap-2">
                <span className="font-semibold text-sm">{cidade}</span>
                <span className="text-xs text-muted-foreground">
                  {lista[0]?.uf} · {lista.length} bairro{lista.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y">
                {lista.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${!b.ativo ? "text-muted-foreground line-through" : ""}`}>
                        {b.nome}
                      </span>
                      {!b.ativo && (
                        <Badge variant="outline" className="text-xs py-0">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                      {b._count.zonas > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {b._count.zonas} loja{b._count.zonas !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => abrirEdicao(b)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => handleToggleAtivo(b)}
                        title={b.ativo ? "Desativar" : "Ativar"}
                      >
                        {b.ativo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleExcluir(b)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog
        open={criando || !!editando}
        onOpenChange={(v) => { if (!v) { setCriando(false); setEditando(null) } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar bairro" : "Novo bairro"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editando ? handleEditar : handleCriar} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="b-nome">Nome</Label>
              <Input
                id="b-nome"
                required
                autoFocus
                placeholder="Ex: Centro, Paiol Grande — Km 2 ao 3"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="space-y-2">
                <Label htmlFor="b-cidade">Cidade</Label>
                <Input
                  id="b-cidade"
                  required
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-uf">UF</Label>
                <Input
                  id="b-uf"
                  required
                  maxLength={2}
                  className="w-16 uppercase"
                  value={form.uf}
                  onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => { setCriando(false); setEditando(null) }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editando ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
