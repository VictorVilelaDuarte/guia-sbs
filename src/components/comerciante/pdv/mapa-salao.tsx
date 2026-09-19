"use client"

import { useEffect, useState } from "react"
import { BellRing, Check, ChefHat, Clock, Hand, Plus, ReceiptText, Send, Sparkles, Users } from "lucide-react"
import type { ComandaResumo, SolicitacaoPainel } from "@/lib/gestao/comandas"
import type { ChamadoPainel, MesaNoMapa } from "@/lib/gestao/mesas"
import { rotuloMesa } from "@/lib/gestao/mesas-link"
import { cn } from "@/lib/utils"
import { brl, centavos } from "./tipos"

function minutosDesde(iso: string, agora: number) {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000))
}

function tempo(min: number) {
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`
}

// Mapa do salão no PDV: uma carta por mesa cadastrada, com o estado atual, mais
// as contas sem mesa (balcão, nome do cliente) num grupo à parte. Tocar numa
// mesa livre abre a conta direto; nas ocupadas, abre a conta existente.
export function MapaSalao({
  mesas,
  comandas,
  chamados,
  solicitacoes,
  ocupado,
  onAbrirComanda,
  onAbrirMesaLivre,
  onLiberarMesa,
  onAtenderChamado,
  onNova,
}: {
  mesas: MesaNoMapa[]
  comandas: ComandaResumo[]
  chamados: ChamadoPainel[]
  solicitacoes: SolicitacaoPainel[]
  ocupado: boolean
  onAbrirComanda: (id: string) => void
  onAbrirMesaLivre: (nome: string) => void
  onLiberarMesa: (id: string) => void
  onAtenderChamado: (id: string) => void
  onNova: () => void
}) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  // Contas que não estão numa mesa do cadastro (balcão, nome, mesa digitada).
  const semMesa = comandas.filter((c) => !c.mesaId)
  const areas = [...new Set(mesas.map((m) => m.area ?? "Salão"))]

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
                  {minutosDesde(s.desde, agora)} min{s.pedidoPor ? ` · ${s.pedidoPor}` : ""} · confirme para entrar na conta e ir para a cozinha
                </span>
              </span>
              <button type="button" onClick={() => onAbrirComanda(s.pedidoId)} className="flex h-10 items-center gap-1.5 rounded-xl bg-stone-900 px-3 text-sm font-semibold text-white">
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
              className={cn("flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5 ring-1", ch.tipo === "CONTA" ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200")}
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

      {areas.map((area) => (
        <section key={area} className="mb-4">
          {areas.length > 1 && <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">{area}</h2>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {mesas
              .filter((m) => (m.area ?? "Salão") === area)
              .map((m) => (
                <CartaoMesa
                  key={m.id}
                  mesa={m}
                  agora={agora}
                  ocupado={ocupado}
                  onAbrirComanda={onAbrirComanda}
                  onAbrirMesaLivre={onAbrirMesaLivre}
                  onLiberarMesa={onLiberarMesa}
                />
              ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
          {semMesa.length > 0 ? "Outras contas" : "Comanda avulsa"}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <button
            type="button"
            onClick={onNova}
            className="flex min-h-[116px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-semibold">Abrir comanda</span>
          </button>
          {semMesa.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onAbrirComanda(c.id)}
              className="flex min-h-[116px] flex-col justify-between rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 hover:ring-stone-400"
            >
              <div>
                <p className="truncate text-base font-bold leading-tight">{c.mesa ? rotuloMesa(c.mesa) : c.clienteNome}</p>
                <p className="truncate text-xs text-stone-500">#{c.numero}</p>
              </div>
              <div className="flex items-end justify-between">
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  <Clock className="h-3 w-3" /> {tempo(minutosDesde(c.createdAt, agora))}
                </span>
                <span className="text-base font-bold tabular-nums">{brl(centavos(c.total))}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {mesas.length === 0 && (
        <p className="mt-6 text-center text-sm text-stone-500">
          Nenhuma mesa cadastrada. Cadastre em Gestão → Mesas para ver o mapa do salão aqui.
        </p>
      )}
    </div>
  )
}

function CartaoMesa({
  mesa,
  agora,
  ocupado,
  onAbrirComanda,
  onAbrirMesaLivre,
  onLiberarMesa,
}: {
  mesa: MesaNoMapa
  agora: number
  ocupado: boolean
  onAbrirComanda: (id: string) => void
  onAbrirMesaLivre: (nome: string) => void
  onLiberarMesa: (id: string) => void
}) {
  const c = mesa.comanda
  const min = c ? minutosDesde(c.abertaEm, agora) : 0
  const estado = c
    ? mesa.chamado === "CONTA"
      ? { cls: "bg-emerald-50 ring-emerald-300", label: "pediu a conta", icone: <ReceiptText className="h-3 w-3" /> }
      : mesa.chamado === "GARCOM"
        ? { cls: "bg-amber-50 ring-amber-300", label: "chamou", icone: <BellRing className="h-3 w-3" /> }
        : { cls: "bg-white ring-stone-200", label: null, icone: null }
    : mesa.aLiberar
      ? { cls: "bg-sky-50 ring-sky-200", label: "a liberar", icone: <Sparkles className="h-3 w-3" /> }
      : { cls: "bg-stone-100 ring-stone-200", label: null, icone: null }

  return (
    <div className={cn("flex min-h-[116px] flex-col justify-between rounded-2xl p-3 shadow-sm ring-1", estado.cls)}>
      <button
        type="button"
        disabled={ocupado}
        onClick={() => (c ? onAbrirComanda(c.id) : onAbrirMesaLivre(mesa.nome))}
        className="flex-1 text-left"
      >
        <p className="flex items-center gap-1.5 text-base font-bold leading-tight">
          {rotuloMesa(mesa.nome)}
          {estado.label && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold">
              {estado.icone} {estado.label}
            </span>
          )}
        </p>
        <p className="flex items-center gap-2 text-xs text-stone-500">
          {c ? `#${c.numero}` : mesa.aLiberar ? "conta fechada" : "livre"}
          {mesa.lugares && (
            <span className="inline-flex items-center gap-0.5">
              <Users className="h-3 w-3" /> {mesa.lugares}
            </span>
          )}
        </p>
        {c && (
          <div className="mt-1 flex flex-wrap gap-1">
            {c.aguardandoAprovacao > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                <Hand className="h-2.5 w-2.5" /> {c.aguardandoAprovacao} do cliente
              </span>
            )}
            {c.naProducao > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                <ChefHat className="h-2.5 w-2.5" /> {c.naProducao} na cozinha
              </span>
            )}
          </div>
        )}
      </button>

      {c ? (
        <div className="flex items-end justify-between">
          <span className={cn("flex items-center gap-1 text-xs", min >= 120 ? "font-semibold text-rose-600" : "text-stone-500")}>
            <Clock className="h-3 w-3" /> {tempo(min)}
          </span>
          <span className="text-right">
            <span className="block text-base font-bold tabular-nums">{brl(centavos(c.total))}</span>
            {c.pago > 0 && <span className="block text-[11px] tabular-nums text-emerald-700">pago {brl(centavos(c.pago))}</span>}
          </span>
        </div>
      ) : mesa.aLiberar ? (
        <button
          type="button"
          onClick={() => onLiberarMesa(mesa.id)}
          className="flex h-8 items-center justify-center gap-1 rounded-lg bg-white text-xs font-semibold text-sky-800 ring-1 ring-sky-200"
        >
          <Check className="h-3.5 w-3.5" /> Liberar
        </button>
      ) : (
        <span className="flex items-center gap-1 text-xs font-medium text-stone-500">
          <Send className="h-3 w-3" /> toque para abrir
        </span>
      )}
    </div>
  )
}
