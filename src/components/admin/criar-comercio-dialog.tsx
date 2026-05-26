"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

const categorias = [
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "HOSPEDAGEM", label: "Hospedagem" },
  { value: "TURISMO", label: "Turismo" },
  { value: "SERVICO", label: "Serviço" },
  { value: "COMERCIO", label: "Comércio" },
  { value: "ENTRETENIMENTO", label: "Entretenimento" },
]

const categoriaLabels: Record<string, string> = Object.fromEntries(categorias.map((c) => [c.value, c.label]))

interface Usuario {
  id: string
  name: string
  email: string
  role: string
  comercio: { id: string; nome: string } | null
}

export function CriarComercioDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [form, setForm] = useState({
    nome: "",
    categoria: "",
    ownerId: "",
    descricao: "",
  })

  useEffect(() => {
    if (!open) return
    fetch("/api/admin/usuarios")
      .then((r) => r.json())
      .then((data: Usuario[]) => {
        const elegíveis = data.filter(
          (u) =>
            u.role === "COMERCIANTE" &&
            !u.comercio
        )
        setUsuarios(elegíveis)
      })
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch("/api/admin/comercios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erro ao criar comércio.")
      return
    }

    toast.success("Comércio criado com sucesso.")
    setOpen(false)
    setForm({ nome: "", categoria: "", ownerId: "", descricao: "" })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />
        Novo comércio
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar comércio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="ownerId">Responsável</Label>
            <Select
              value={form.ownerId}
              onValueChange={(v) => setForm({ ...form, ownerId: v ?? form.ownerId })}
            >
              <SelectTrigger id="ownerId">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Selecione um comerciante..."
                    const u = usuarios.find((u) => u.id === value)
                    return u ? `${u.name} (${u.email})` : value
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {usuarios.length === 0 && (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    Nenhum comerciante disponível.
                  </div>
                )}
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do comércio</Label>
            <Input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm({ ...form, categoria: v ?? form.categoria })}
            >
              <SelectTrigger id="categoria">
                <SelectValue>
                  {(value: string | null) => value ? (categoriaLabels[value] ?? value) : "Selecione uma categoria..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <textarea
              id="descricao"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !form.ownerId || !form.categoria}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
