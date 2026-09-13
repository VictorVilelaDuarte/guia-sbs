"use client"

import { useState } from "react"
import { Check, Copy, KeyRound, Loader2, Plus, Trash2, UserX, UserCheck } from "lucide-react"
import { toast } from "sonner"
import type { PapelMembro } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { PAPEIS, papelLabel } from "@/lib/gestao/permissoes"
import type { MembroEquipe } from "@/lib/gestao/equipe"

const API = "/api/comerciante/gestao/equipe"

async function lerErro(res: Response, padrao: string) {
  const data = await res.json().catch(() => ({}))
  return (data.error as string | undefined) ?? padrao
}

export function EquipeManager({ equipeInicial }: { equipeInicial: MembroEquipe[] }) {
  const [equipe, setEquipe] = useState(equipeInicial)
  const [adicionando, setAdicionando] = useState(false)
  const [ocupadoId, setOcupadoId] = useState<string | null>(null)
  // Senha temporária exibida uma única vez (criação ou reset).
  const [credencial, setCredencial] = useState<{ nome: string; email: string; senha: string } | null>(null)

  async function alterar(m: MembroEquipe, dados: { papel?: PapelMembro; ativo?: boolean }) {
    setOcupadoId(m.id)
    try {
      const res = await fetch(`${API}/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      if (!res.ok) return toast.error(await lerErro(res, "Não foi possível alterar."))
      setEquipe(await res.json())
      toast.success(
        dados.papel ? `${m.nome} agora é ${papelLabel(dados.papel)}.` : dados.ativo ? "Acesso reativado." : "Acesso desativado.",
      )
    } finally {
      setOcupadoId(null)
    }
  }

  async function remover(m: MembroEquipe) {
    if (!confirm(`Remover ${m.nome} da equipe? O acesso é cortado imediatamente.`)) return
    setOcupadoId(m.id)
    try {
      const res = await fetch(`${API}/${m.id}`, { method: "DELETE" })
      if (!res.ok) return toast.error(await lerErro(res, "Não foi possível remover."))
      const data: { equipe: MembroEquipe[]; contaApagada: boolean } = await res.json()
      setEquipe(data.equipe)
      toast.success(data.contaApagada ? `${m.nome} removido(a) e conta apagada.` : `${m.nome} removido(a) da equipe.`)
    } finally {
      setOcupadoId(null)
    }
  }

  async function novaSenha(m: MembroEquipe) {
    if (!confirm(`Gerar uma nova senha temporária para ${m.nome}? A senha atual deixa de funcionar.`)) return
    setOcupadoId(m.id)
    try {
      const res = await fetch(`${API}/${m.id}/senha`, { method: "POST" })
      if (!res.ok) return toast.error(await lerErro(res, "Não foi possível gerar a senha."))
      const { senhaTemporaria } = await res.json()
      setCredencial({ nome: m.nome, email: m.email, senha: senhaTemporaria })
    } finally {
      setOcupadoId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {equipe.length} {equipe.length === 1 ? "pessoa" : "pessoas"} com acesso
        </p>
        <Button size="sm" onClick={() => setAdicionando(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar membro
        </Button>
      </div>

      <div className="space-y-3">
        {equipe.map((m) => {
          const travado = m.voce || m.titular
          const ocupado = ocupadoId === m.id
          return (
            <div
              key={m.id}
              className={cn("rounded-lg border border-border bg-background p-4", !m.ativo && "opacity-70")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    {m.nome}
                    {m.voce && <Selo>Você</Selo>}
                    {m.titular && <Selo>Titular</Selo>}
                    {!m.ativo && <Selo tom="rose">Desativado</Selo>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                </div>

                <div className="w-44">
                  <Select
                    value={m.papel}
                    disabled={travado || ocupado}
                    onValueChange={(v) => v && v !== m.papel && alterar(m, { papel: v as PapelMembro })}
                  >
                    <SelectTrigger aria-label={`Papel de ${m.nome}`}>
                      <SelectValue>{(v: string | null) => (v ? papelLabel(v as PapelMembro) : "")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PAPEIS.map((p) => (
                        <SelectItem key={p.papel} value={p.papel}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {travado ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {m.voce
                    ? "Você não pode alterar o próprio acesso."
                    : "O titular do comércio só pode ser alterado pelo administrador do guia."}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={ocupado} onClick={() => alterar(m, { ativo: !m.ativo })}>
                    {m.ativo ? <UserX className="mr-1.5 h-4 w-4" /> : <UserCheck className="mr-1.5 h-4 w-4" />}
                    {m.ativo ? "Desativar" : "Reativar"}
                  </Button>
                  {m.podeResetarSenha && (
                    <Button size="sm" variant="outline" disabled={ocupado} onClick={() => novaSenha(m)}>
                      <KeyRound className="mr-1.5 h-4 w-4" />
                      Nova senha
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={ocupado}
                    className="hover:text-destructive"
                    onClick={() => remover(m)}
                  >
                    {ocupado ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
                    Remover
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-lg bg-muted/40 p-4">
        <p className="mb-2 text-sm font-medium">O que cada papel pode fazer</p>
        <ul className="space-y-1 text-sm">
          {PAPEIS.map((p) => (
            <li key={p.papel}>
              <strong>{p.label}:</strong> {p.descricao}
            </li>
          ))}
        </ul>
      </div>

      <AdicionarMembroDialog
        open={adicionando}
        onClose={() => setAdicionando(false)}
        onAdicionado={(novaEquipe, cred) => {
          setEquipe(novaEquipe)
          setAdicionando(false)
          if (cred) setCredencial(cred)
          else toast.success("Vínculo criado. Essa pessoa já tinha conta e entra com a própria senha.")
        }}
      />

      <CredencialDialog credencial={credencial} onClose={() => setCredencial(null)} />
    </div>
  )
}

function Selo({ children, tom = "stone" }: { children: React.ReactNode; tom?: "stone" | "rose" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tom === "rose" ? "bg-rose-100 text-rose-700" : "bg-stone-100 text-stone-700",
      )}
    >
      {children}
    </span>
  )
}

function AdicionarMembroDialog({
  open,
  onClose,
  onAdicionado,
}: {
  open: boolean
  onClose: () => void
  onAdicionado: (equipe: MembroEquipe[], cred: { nome: string; email: string; senha: string } | null) => void
}) {
  const [form, setForm] = useState({ nome: "", email: "", papel: "ATENDENTE" as PapelMembro })
  const [salvando, setSalvando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) return toast.error(await lerErro(res, "Não foi possível adicionar."))
      const data: { equipe: MembroEquipe[]; senhaTemporaria: string | null } = await res.json()
      onAdicionado(
        data.equipe,
        data.senhaTemporaria
          ? { nome: form.nome, email: form.email.trim().toLowerCase(), senha: data.senhaTemporaria }
          : null,
      )
      setForm({ nome: "", email: "", papel: "ATENDENTE" })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar membro</DialogTitle>
        </DialogHeader>
        <form onSubmit={enviar} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="membro-nome">Nome</Label>
            <Input
              id="membro-nome"
              required
              minLength={2}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="membro-email">E-mail</Label>
            <Input
              id="membro-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Se a pessoa ainda não tem conta, criamos uma com senha temporária.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="membro-papel">Papel</Label>
            <Select value={form.papel} onValueChange={(v) => v && setForm({ ...form, papel: v as PapelMembro })}>
              <SelectTrigger id="membro-papel">
                <SelectValue>{(v: string | null) => (v ? papelLabel(v as PapelMembro) : "")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.map((p) => (
                  <SelectItem key={p.papel} value={p.papel}>
                    {p.label} — {p.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CredencialDialog({
  credencial,
  onClose,
}: {
  credencial: { nome: string; email: string; senha: string } | null
  onClose: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  if (!credencial) return null

  const mensagem =
    `Olá, ${credencial.nome.split(" ")[0]}! Seu acesso ao painel:\n` +
    `${typeof window !== "undefined" ? window.location.origin : ""}/admin/login\n` +
    `E-mail: ${credencial.email}\n` +
    `Senha temporária: ${credencial.senha}\n` +
    `No primeiro acesso você vai criar uma senha só sua.`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error("Não foi possível copiar — selecione o texto manualmente.")
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Acesso de {credencial.nome}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <p className="text-sm">
            Envie estes dados para a pessoa. <strong>A senha não será mostrada de novo</strong> — se
            perder, gere outra.
          </p>
          <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted/60 p-3 text-sm">{mensagem}</pre>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={copiar}>
              {copiado ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copiado ? "Copiado" : "Copiar mensagem"}
            </Button>
            <Button onClick={onClose}>Pronto</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
