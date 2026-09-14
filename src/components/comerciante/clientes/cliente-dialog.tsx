"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MESES } from "./formato"

export interface ClienteForm {
  id?: string
  nome: string
  whatsapp: string | null
  email: string | null
  aniversario: { dia: number; mes: number } | null
  observacoes: string | null
  tags: string[]
}

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

// Cadastro manual (cliente de balcão) e edição. Aniversário só com dia e mês.
export function ClienteDialog({ cliente }: { cliente?: ClienteForm }) {
  const router = useRouter()
  const editando = !!cliente?.id
  const [open, setOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [duplicadoId, setDuplicadoId] = useState<string | null>(null)
  const inicial = () => ({
    nome: cliente?.nome ?? "",
    whatsapp: cliente?.whatsapp ?? "",
    email: cliente?.email ?? "",
    dia: cliente?.aniversario?.dia ? String(cliente.aniversario.dia) : "",
    mes: cliente?.aniversario?.mes ? String(cliente.aniversario.mes) : "",
    observacoes: cliente?.observacoes ?? "",
    tags: (cliente?.tags ?? []).join(", "),
  })
  const [form, setForm] = useState(inicial)

  function abrir() {
    setForm(inicial())
    setDuplicadoId(null)
    setOpen(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setDuplicadoId(null)
    try {
      const body = {
        nome: form.nome,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        aniversarioDia: form.dia ? Number(form.dia) : null,
        aniversarioMes: form.mes ? Number(form.mes) : null,
        observacoes: form.observacoes.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }
      const res = await fetch(
        editando ? `/api/comerciante/gestao/clientes/${cliente!.id}` : "/api/comerciante/gestao/clientes",
        { method: editando ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível salvar.")
        if (data.clienteExistenteId) setDuplicadoId(data.clienteExistenteId)
        return
      }
      toast.success(editando ? "Cliente atualizado." : "Cliente cadastrado.")
      setOpen(false)
      if (editando) router.refresh()
      else router.push(`/comerciante/gestao/clientes/${data.id}`)
    } finally {
      setSalvando(false)
    }
  }

  const tagsPreview = form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)

  return (
    <>
      {editando ? (
        <Button size="sm" variant="outline" onClick={abrir}>
          <Pencil className="mr-1.5 h-4 w-4" />
          Editar
        </Button>
      ) : (
        <Button size="sm" onClick={abrir}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Novo cliente
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="mt-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cli-nome">Nome</Label>
              <Input id="cli-nome" required minLength={2} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cli-whats">WhatsApp</Label>
                <Input id="cli-whats" inputMode="tel" placeholder="(12) 99999-0000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cli-email">E-mail</Label>
                <Input id="cli-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            {duplicadoId && (
              <p className="text-sm">
                <Link href={`/comerciante/gestao/clientes/${duplicadoId}`} className="font-medium underline" onClick={() => setOpen(false)}>
                  Abrir o cliente com este WhatsApp
                </Link>
              </p>
            )}
            <div className="space-y-2">
              <Label>Aniversário</Label>
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="Dia" className={selectCls} value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })}>
                  <option value="">Dia</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <select aria-label="Mês" className={selectCls} value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })}>
                  <option value="">Mês</option>
                  {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cli-obs">Observações</Label>
              <Textarea id="cli-obs" rows={3} placeholder="Ex.: alérgico a amendoim, sempre pede sem cebola" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cli-tags">Tags</Label>
              <Input id="cli-tags" placeholder="vip, delivery" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              {tagsPreview.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tagsPreview.slice(0, 10).map((t) => (
                    <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{t}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Separe por vírgula. Até 10.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
