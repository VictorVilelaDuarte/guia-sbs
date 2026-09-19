"use client"

import { useState } from "react"
import { ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { GrupoPainel } from "@/lib/gestao/complementos"
import { cn } from "@/lib/utils"

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const parsePreco = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

interface FormGrupo {
  nome: string
  minimo: number
  maximo: number
  opcoes: { nome: string; preco: string; quantidadeMax: number }[]
}

const VAZIO: FormGrupo = { nome: "", minimo: 0, maximo: 1, opcoes: [{ nome: "", preco: "", quantidadeMax: 1 }] }

// Grupos de complementos da loja ("Borda", "Adicionais", "Ponto da carne").
// Cada grupo é reaproveitado por vários produtos — o vínculo é feito no item.
export function ComplementosManager({ iniciais, somenteLeitura }: { iniciais: GrupoPainel[]; somenteLeitura?: boolean }) {
  const [grupos, setGrupos] = useState(iniciais)
  const [editando, setEditando] = useState<GrupoPainel | null>(null)
  const [criando, setCriando] = useState(false)
  const [aberto, setAberto] = useState<string | null>(null)

  async function salvar(form: FormGrupo, id?: string) {
    const body = {
      nome: form.nome.trim(),
      minimo: form.minimo,
      maximo: form.maximo,
      opcoes: form.opcoes
        .filter((o) => o.nome.trim())
        .map((o) => ({ nome: o.nome.trim(), preco: parsePreco(o.preco), quantidadeMax: o.quantidadeMax })),
    }
    const res = await fetch(id ? `/api/comerciante/gestao/complementos/${id}` : "/api/comerciante/gestao/complementos", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (!res?.ok) {
      toast.error(data?.error ?? "Não foi possível salvar o grupo.")
      return false
    }
    setGrupos(data)
    toast.success(id ? "Grupo atualizado." : "Grupo criado.")
    return true
  }

  async function excluir(g: GrupoPainel) {
    const aviso = g.produtos > 0 ? `O grupo "${g.nome}" está em ${g.produtos} item(ns). Excluir mesmo assim?` : `Excluir o grupo "${g.nome}"?`
    if (!window.confirm(`${aviso} As vendas já feitas continuam com o registro do que foi escolhido.`)) return
    const res = await fetch(`/api/comerciante/gestao/complementos/${g.id}`, { method: "DELETE" }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (!res?.ok) return toast.error(data?.error ?? "Não foi possível excluir.")
    setGrupos(data)
    toast.success("Grupo excluído.")
  }

  return (
    <div className="space-y-3">
      {grupos.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum grupo ainda. Crie &quot;Adicionais&quot;, &quot;Borda&quot; ou &quot;Ponto da carne&quot; e ligue nos itens do cardápio.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {grupos.map((g) => (
            <li key={g.id} className="py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setAberto(aberto === g.id ? null : g.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", aberto === g.id && "rotate-180")} />
                  <span className="min-w-0">
                    <span className="block font-medium">{g.nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {g.opcoes.length} opção(ões) · escolha {g.minimo === g.maximo ? g.minimo : `${g.minimo} a ${g.maximo}`}
                      {g.minimo > 0 ? " · obrigatório" : " · opcional"} · {g.produtos} item(ns)
                    </span>
                  </span>
                </button>
                {!somenteLeitura && (
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Editar ${g.nome}`} onClick={() => setEditando(g)} className="rounded-md p-2 text-muted-foreground hover:bg-accent">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Excluir ${g.nome}`} onClick={() => excluir(g)} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {aberto === g.id && (
                <ul className="mt-2 space-y-1 pl-6 text-sm">
                  {g.opcoes.map((o) => (
                    <li key={o.id} className="flex justify-between gap-2">
                      <span className={cn(!o.disponivel && "text-muted-foreground line-through")}>
                        {o.nome}
                        {o.quantidadeMax > 1 && <span className="text-xs text-muted-foreground"> · até {o.quantidadeMax}×</span>}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{o.preco > 0 ? `+ ${brl(o.preco)}` : "grátis"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {!somenteLeitura && (
        <Button variant="outline" onClick={() => setCriando(true)}>
          <Plus className="h-4 w-4" /> Novo grupo
        </Button>
      )}

      <GrupoDialog
        open={criando || !!editando}
        grupo={editando}
        onClose={() => {
          setCriando(false)
          setEditando(null)
        }}
        onSalvar={salvar}
      />
    </div>
  )
}

function GrupoDialog({
  open,
  grupo,
  onClose,
  onSalvar,
}: {
  open: boolean
  grupo: GrupoPainel | null
  onClose: () => void
  onSalvar: (f: FormGrupo, id?: string) => Promise<boolean>
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{grupo ? `Editar ${grupo.nome}` : "Novo grupo de complementos"}</DialogTitle>
        </DialogHeader>
        {open && <FormularioGrupo grupo={grupo} onClose={onClose} onSalvar={onSalvar} />}
      </DialogContent>
    </Dialog>
  )
}

function FormularioGrupo({
  grupo,
  onClose,
  onSalvar,
}: {
  grupo: GrupoPainel | null
  onClose: () => void
  onSalvar: (f: FormGrupo, id?: string) => Promise<boolean>
}) {
  const [form, setForm] = useState<FormGrupo>(() =>
    grupo
      ? {
          nome: grupo.nome,
          minimo: grupo.minimo,
          maximo: grupo.maximo,
          opcoes: grupo.opcoes.map((o) => ({
            nome: o.nome,
            preco: o.preco > 0 ? o.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
            quantidadeMax: o.quantidadeMax,
          })),
        }
      : VAZIO,
  )
  const [salvando, setSalvando] = useState(false)
  const set = (p: Partial<FormGrupo>) => setForm((f) => ({ ...f, ...p }))
  const opcoesValidas = form.opcoes.filter((o) => o.nome.trim()).length

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (salvando) return
        setSalvando(true)
        try {
          if (await onSalvar(form, grupo?.id)) onClose()
        } finally {
          setSalvando(false)
        }
      }}
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="grupo-nome">Nome do grupo</label>
        <Input id="grupo-nome" autoFocus value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Adicionais, Borda, Ponto da carne" maxLength={60} className="text-[16px]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="grupo-min">Escolhas mínimas</label>
          <Input id="grupo-min" type="number" min={0} max={20} value={form.minimo} onChange={(e) => set({ minimo: Number(e.target.value) })} className="text-[16px]" />
          <p className="text-xs text-muted-foreground">0 = opcional</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="grupo-max">Escolhas máximas</label>
          <Input id="grupo-max" type="number" min={1} max={20} value={form.maximo} onChange={(e) => set({ maximo: Number(e.target.value) })} className="text-[16px]" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_6.5rem_4.5rem_2rem] gap-2 px-1">
          <span className="text-xs text-muted-foreground">Opção</span>
          <span className="text-xs text-muted-foreground">Preço</span>
          <span className="text-xs text-muted-foreground">Até</span>
          <span />
        </div>
        {form.opcoes.map((o, i) => (
          <div key={i} className="grid grid-cols-[1fr_6.5rem_4.5rem_2rem] items-center gap-2">
            <Input
              value={o.nome}
              onChange={(e) => set({ opcoes: form.opcoes.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })}
              placeholder="Ex.: Bacon, sem cebola"
              maxLength={60}
              className="text-[16px]"
            />
            <Input
              value={o.preco}
              onChange={(e) => set({ opcoes: form.opcoes.map((x, j) => (j === i ? { ...x, preco: e.target.value } : x)) })}
              placeholder="0,00"
              inputMode="decimal"
              className="text-[16px]"
            />
            <Input
              type="number"
              min={1}
              max={20}
              value={o.quantidadeMax}
              onChange={(e) => set({ opcoes: form.opcoes.map((x, j) => (j === i ? { ...x, quantidadeMax: Number(e.target.value) } : x)) })}
              className="text-[16px]"
            />
            <button
              type="button"
              aria-label="Remover opção"
              onClick={() => set({ opcoes: form.opcoes.filter((_, j) => j !== i) })}
              className="rounded-md p-2 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => set({ opcoes: [...form.opcoes, { nome: "", preco: "", quantidadeMax: 1 }] })}>
          <Plus className="h-3.5 w-3.5" /> Opção
        </Button>
        <p className="text-xs text-muted-foreground">Preço vazio ou zero vira opção grátis (&quot;sem cebola&quot;, &quot;ao ponto&quot;). &quot;Até&quot; permite repetir a mesma opção (2× bacon).</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={salvando || !form.nome.trim() || opcoesValidas === 0}>
          {grupo ? "Salvar" : "Criar grupo"}
        </Button>
      </div>
    </form>
  )
}
