"use client"

import { useEffect, useState } from "react"
import { BellRing, Check, ChefHat, Clock, Hand, Plus, ReceiptText, Send } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ComandaResumo } from "@/lib/gestao/comandas"
import type { SolicitacaoPainel } from "@/lib/gestao/comandas"
import type { ChamadoPainel } from "@/lib/gestao/mesas"
import { cn } from "@/lib/utils"
import { rotuloMesa } from "@/lib/gestao/mesas-link"
import { brl, centavos } from "./tipos"

function minutosDesde(iso: string, agora: number) {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000))
}

function tempo(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return `${h}h${String(min % 60).padStart(2, "0")}`
}

// Mesas/comandas abertas: toque para abrir a conta. Mostra o que falta lançar e
// o que está na produção, e há quanto tempo a mesa está aberta.
export function ComandasGrid({
  comandas,
  chamados,
  solicitacoes,
  onAtenderChamado,
  onAbrir,
  onNova,
}: {
  comandas: ComandaResumo[]
  chamados: ChamadoPainel[]
  solicitacoes: SolicitacaoPainel[]
  onAtenderChamado: (id: string) => void
  onAbrir: (id: string) => void
  onNova: () => void
}) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4">
      {solicitacoes.length > 0 && (
        <ul className="mb-3 space-y-2">
          {solicitacoes.map((s) => (
            <li key={s.pedidoId} className="flex flex-wrap items-center gap-2 rounded-2xl bg-violet-50 px-3 py-2.5 ring-1 ring-violet-200">
              <Hand className="h-5 w-5 text-violet-700" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {s.mesa ? rotuloMesa(s.mesa) : s.clienteNome} pediu {s.itens} item(ns) pelo QR
                </span>
                <span className="block text-xs text-stone-600">
                  {minutosDesde(s.desde, agora)} min{s.pedidoPor ? ` · ${s.pedidoPor}` : ""} · confirme para entrar na conta
                </span>
              </span>
              <button type="button" onClick={() => onAbrir(s.pedidoId)} className="flex h-10 items-center gap-1.5 rounded-xl bg-stone-900 px-3 text-sm font-semibold text-white">
                Ver pedido
              </button>
            </li>
          ))}
        </ul>
      )}
      {chamados.length > 0 && (
        <ul className="mb-3 space-y-2">
          {chamados.map((ch) => (
            <li
              key={ch.id}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5 ring-1",
                ch.tipo === "CONTA" ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200",
              )}
            >
              {ch.tipo === "CONTA" ? <ReceiptText className="h-5 w-5 text-emerald-700" /> : <BellRing className="h-5 w-5 text-amber-700" />}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {rotuloMesa(ch.mesa)} {ch.tipo === "CONTA" ? "pediu a conta" : "chamou o atendente"}
                </span>
                <span className="block text-xs text-stone-600">
                  {minutosDesde(ch.criadoEm, agora)} min{ch.area ? ` · ${ch.area}` : ""}
                  {ch.observacao ? ` · ${ch.observacao}` : ""}
                </span>
              </span>
              <button type="button" onClick={() => onAtenderChamado(ch.id)} className="flex h-10 items-center gap-1.5 rounded-xl bg-stone-900 px-3 text-sm font-semibold text-white">
                <Check className="h-4 w-4" /> Atendi
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <button
          type="button"
          onClick={onNova}
          className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm font-semibold">Abrir comanda</span>
        </button>
        {comandas.map((c) => {
          const min = minutosDesde(c.createdAt, agora)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onAbrir(c.id)}
              className="flex min-h-[120px] flex-col justify-between rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 hover:ring-stone-400"
            >
              <div>
                <p className="text-lg font-bold leading-tight">{c.mesa ? rotuloMesa(c.mesa) : c.clienteNome}</p>
                <p className="truncate text-xs text-stone-500">
                  #{c.numero}
                  {c.mesa && c.clienteNome !== `Mesa ${c.mesa}` ? ` · ${c.clienteNome}` : ""}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap gap-1">
                  {c.naoEnviados > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      <Send className="h-2.5 w-2.5" /> {c.naoEnviados} sem enviar
                    </span>
                  )}
                  {c.aguardandoAprovacao > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                      <Hand className="h-2.5 w-2.5" /> {c.aguardandoAprovacao} do cliente
                    </span>
                  )}
                  {c.naProducao > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                      <ChefHat className="h-2.5 w-2.5" /> {c.naProducao} na produção
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <span className={cn("flex items-center gap-1 text-xs", min >= 120 ? "font-semibold text-rose-600" : "text-stone-500")}>
                    <Clock className="h-3 w-3" /> {tempo(min)}
                  </span>
                  <span className="text-right">
                    <span className="block text-base font-bold tabular-nums">{brl(centavos(c.total))}</span>
                    {c.pago > 0 && <span className="block text-[11px] tabular-nums text-emerald-700">pago {brl(centavos(c.pago))}</span>}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {comandas.length === 0 && (
        <p className="mt-6 text-center text-sm text-stone-500">Nenhuma comanda aberta. Abra uma por mesa ou pelo nome do cliente.</p>
      )}
    </div>
  )
}

export function AbrirComandaDialog({
  open,
  onOpenChange,
  servicoPct,
  onAbrir,
  titulo = "Abrir comanda",
  inicial,
  mesasLivres = [],
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  servicoPct: number | null
  onAbrir: (d: { mesa: string; nome: string; cobrarServico: boolean }) => Promise<void>
  titulo?: string
  inicial?: { mesa: string; nome: string }
  mesasLivres?: string[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {open && <FormComanda servicoPct={servicoPct} onAbrir={onAbrir} inicial={inicial} editar={!!inicial} mesasLivres={mesasLivres} />}
      </DialogContent>
    </Dialog>
  )
}

function FormComanda({ servicoPct, onAbrir, inicial, editar, mesasLivres }: {
  servicoPct: number | null
  onAbrir: (d: { mesa: string; nome: string; cobrarServico: boolean }) => Promise<void>
  inicial?: { mesa: string; nome: string }
  editar: boolean
  mesasLivres: string[]
}) {
  const [mesa, setMesa] = useState(inicial?.mesa ?? "")
  const [nome, setNome] = useState(inicial?.nome ?? "")
  const [servico, setServico] = useState(servicoPct != null)
  const [ocupado, setOcupado] = useState(false)
  const campo = "h-12 w-full rounded-xl border border-stone-300 px-3 text-[16px]"
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!mesa.trim() && !nome.trim()) return
        setOcupado(true)
        try {
          await onAbrir({ mesa: mesa.trim(), nome: nome.trim(), cobrarServico: servico })
        } finally {
          setOcupado(false)
        }
      }}
    >
      <input autoFocus value={mesa} onChange={(e) => setMesa(e.target.value)} placeholder="Mesa (ex.: 4, Varanda 2)" maxLength={20} className={cn(campo, "text-lg font-semibold")} />
      {mesasLivres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mesasLivres.slice(0, 12).map((m) => (
            <button key={m} type="button" onClick={() => setMesa(m)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium ring-1", mesa === m ? "bg-stone-900 text-white ring-stone-900" : "bg-white ring-stone-300")}>
              {m}
            </button>
          ))}
        </div>
      )}
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={editar ? "Nome da comanda" : "Nome do cliente (opcional com mesa)"} maxLength={60} className={campo} />
      {!editar && servicoPct != null && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={servico} onChange={(e) => setServico(e.target.checked)} className="h-4 w-4" />
          Cobrar taxa de serviço ({String(servicoPct).replace(".", ",")}%)
        </label>
      )}
      <button type="submit" disabled={ocupado || (!mesa.trim() && !nome.trim())} className="h-12 w-full rounded-xl bg-stone-900 font-semibold text-white disabled:opacity-40">
        {editar ? "Salvar" : "Abrir"}
      </button>
    </form>
  )
}
