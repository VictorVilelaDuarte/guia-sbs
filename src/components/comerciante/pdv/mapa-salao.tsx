"use client"

import { useEffect, useRef, useState } from "react"
import { BellRing, Check, ChefHat, Clock, Hand, LayoutGrid, List, Plus, ReceiptText, Send, Sparkles, Users } from "lucide-react"
import type { ComandaResumo, SolicitacaoPainel } from "@/lib/gestao/comandas"
import type { ChamadoPainel, MesaNoMapa } from "@/lib/gestao/mesas"
import { rotuloMesa } from "@/lib/gestao/mesas-link"
import { cn } from "@/lib/utils"
import { brl, centavos } from "./tipos"

const CHAVE_MODO = "pdv:mapa-modo"
const CELULA_MIN = 76 // abaixo disso o cartão deixa de ser legível — entra rolagem
const CELULA_MAX = 150

function minutosDesde(iso: string, agora: number) {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000))
}

function tempo(min: number) {
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`
}

const areaDe = (m: MesaNoMapa) => m.area?.trim() || "Salão"

// Estado visual da mesa, compartilhado pela planta e pela lista.
function estadoDaMesa(m: MesaNoMapa) {
  if (m.comanda) {
    if (m.chamado === "CONTA") return { cls: "bg-emerald-50 ring-emerald-300", label: "pediu a conta", Icone: ReceiptText }
    if (m.chamado === "GARCOM") return { cls: "bg-amber-50 ring-amber-300", label: "chamou", Icone: BellRing }
    return { cls: "bg-white ring-stone-200", label: null, Icone: null }
  }
  if (m.aLiberar) return { cls: "bg-sky-50 ring-sky-200", label: "a liberar", Icone: Sparkles }
  return { cls: "bg-stone-100 ring-stone-200", label: null, Icone: null }
}

// Mapa do salão no PDV. Em "planta", as mesas aparecem na posição montada na
// Gestão; em "lista", viram cartões em grade (bom para celular pequeno e para
// quem ainda não montou a planta). A escolha fica salva no aparelho.
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

  const temPlanta = mesas.some((m) => m.posX != null && m.posY != null)
  const [modo, setModo] = useState<"planta" | "lista">(() => {
    if (typeof window === "undefined") return "planta"
    try {
      const salvo = window.localStorage.getItem(CHAVE_MODO)
      if (salvo === "planta" || salvo === "lista") return salvo
    } catch {
      // sem armazenamento local: segue no padrão
    }
    return "planta"
  })
  const modoAtual = temPlanta ? modo : "lista"

  function trocarModo(novo: "planta" | "lista") {
    setModo(novo)
    try {
      window.localStorage.setItem(CHAVE_MODO, novo)
    } catch {
      // sem armazenamento local: vale só nesta sessão
    }
  }

  const semMesa = comandas.filter((c) => !c.mesaId)
  const areas = [...new Set(mesas.map(areaDe))]

  // A célula é medida UMA vez para todas as áreas: a mesma mesa não pode
  // aparecer grande na Varanda e pequena no Salão — isso é uma planta.
  const medidorRef = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(0)
  useEffect(() => {
    const el = medidorRef.current
    if (!el) return
    const medir = () => setLargura(el.clientWidth)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const posicionadas = mesas.filter((m) => m.posX != null && m.posY != null)
  const colunasMax = areas.reduce((max, area) => {
    const daArea = posicionadas.filter((m) => areaDe(m) === area)
    if (daArea.length === 0) return max
    const cols = Math.max(...daArea.map((m) => m.posX!)) - Math.min(...daArea.map((m) => m.posX!)) + 1
    return Math.max(max, cols)
  }, 1)
  const celula = largura > 0 ? Math.min(Math.max(Math.floor(largura / colunasMax), CELULA_MIN), CELULA_MAX) : CELULA_MIN

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4">
      <Avisos
        chamados={chamados}
        solicitacoes={solicitacoes}
        agora={agora}
        onAbrirComanda={onAbrirComanda}
        onAtenderChamado={onAtenderChamado}
      />

      {temPlanta && (
        <div className="mb-3 flex justify-end">
          <div className="flex rounded-xl bg-stone-100 p-0.5">
            {([
              ["planta", "Planta", LayoutGrid],
              ["lista", "Lista", List],
            ] as const).map(([valor, rotulo, Icone]) => (
              <button
                key={valor}
                type="button"
                onClick={() => trocarModo(valor)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
                  modoAtual === valor ? "bg-white shadow-sm" : "text-stone-600",
                )}
              >
                <Icone className="h-4 w-4" /> {rotulo}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={medidorRef}>
      {areas.map((area) => {
        const daArea = mesas.filter((m) => areaDe(m) === area)
        const naPlanta = daArea.filter((m) => m.posX != null && m.posY != null)
        const soltas = daArea.filter((m) => m.posX == null || m.posY == null)
        return (
          <section key={area} className="mb-4">
            {areas.length > 1 && <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">{area}</h2>}

            {modoAtual === "planta" && naPlanta.length > 0 ? (
              <Planta
                mesas={naPlanta}
                celula={celula}
                agora={agora}
                ocupado={ocupado}
                onAbrirComanda={onAbrirComanda}
                onAbrirMesaLivre={onAbrirMesaLivre}
                onLiberarMesa={onLiberarMesa}
              />
            ) : null}

            {(modoAtual === "lista" ? daArea : soltas).length > 0 && (
              <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6", modoAtual === "planta" && naPlanta.length > 0 && "mt-3")}>
                {(modoAtual === "lista" ? daArea : soltas).map((m) => (
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
            )}
          </section>
        )
      })}
      </div>

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
          Nenhuma mesa cadastrada. Cadastre em Gestão → Mesas e monte a planta do salão.
        </p>
      )}
    </div>
  )
}

// ---- planta (posições montadas na Gestão) ------------------------------------------

function Planta({
  mesas,
  celula,
  agora,
  ocupado,
  onAbrirComanda,
  onAbrirMesaLivre,
  onLiberarMesa,
}: {
  mesas: MesaNoMapa[]
  celula: number
  agora: number
  ocupado: boolean
  onAbrirComanda: (id: string) => void
  onAbrirMesaLivre: (nome: string) => void
  onLiberarMesa: (id: string) => void
}) {
  // Só o retângulo realmente usado: salão de 4 mesas não vira uma quadra vazia.
  const minX = Math.min(...mesas.map((m) => m.posX!))
  const minY = Math.min(...mesas.map((m) => m.posY!))
  const colunas = Math.max(...mesas.map((m) => m.posX!)) - minX + 1
  const linhas = Math.max(...mesas.map((m) => m.posY!)) - minY + 1
  const compacto = celula < 108

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ width: celula * colunas, height: celula * linhas, minWidth: "100%" }}>
        {mesas.map((m) => {
          const c = m.comanda
          const e = estadoDaMesa(m)
          const min = c ? minutosDesde(c.abertaEm, agora) : 0
          return (
            <button
              key={m.id}
              type="button"
              disabled={ocupado}
              onClick={() => (c ? onAbrirComanda(c.id) : m.aLiberar ? onLiberarMesa(m.id) : onAbrirMesaLivre(m.nome))}
              className={cn(
                "absolute flex flex-col justify-between rounded-xl p-2 text-left shadow-sm ring-1 transition active:scale-[0.98]",
                e.cls,
              )}
              style={{ left: (m.posX! - minX) * celula + 4, top: (m.posY! - minY) * celula + 4, width: celula - 8, height: celula - 8 }}
            >
              <span className="min-w-0">
                <span className="flex items-start gap-1">
                  <span className={cn("font-bold leading-tight", compacto ? "line-clamp-2 text-[13px]" : "truncate text-sm")}>
                    {rotuloMesa(m.nome)}
                  </span>
                  {e.Icone && <e.Icone className="mt-0.5 h-3 w-3 shrink-0" />}
                  {/* Na célula pequena o detalhe vira ponto: roxo = pedido do
                      cliente esperando, azul = item na cozinha. */}
                  {compacto && c && (c.aguardandoAprovacao > 0 || c.naProducao > 0) && (
                    <span className="mt-1 flex shrink-0 gap-0.5">
                      {c.aguardandoAprovacao > 0 && <span className="block h-1.5 w-1.5 rounded-full bg-violet-500" />}
                      {c.naProducao > 0 && <span className="block h-1.5 w-1.5 rounded-full bg-sky-500" />}
                    </span>
                  )}
                </span>
                {!compacto && (
                  <span className="block truncate text-[11px] text-stone-500">
                    {c ? `#${c.numero}` : m.aLiberar ? "a liberar" : "livre"}
                    {m.lugares ? ` · ${m.lugares} lug.` : ""}
                  </span>
                )}
              </span>

              {c ? (
                <span className="min-w-0">
                  {!compacto && (c.aguardandoAprovacao > 0 || c.naProducao > 0) && (
                    <span className="mb-0.5 flex flex-wrap gap-1">
                      {c.aguardandoAprovacao > 0 && (
                        <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1 py-0.5 text-[9px] font-semibold text-violet-800">
                          <Hand className="h-2 w-2" /> {c.aguardandoAprovacao}
                        </span>
                      )}
                      {c.naProducao > 0 && (
                        <span className="flex items-center gap-0.5 rounded-full bg-sky-100 px-1 py-0.5 text-[9px] font-semibold text-sky-800">
                          <ChefHat className="h-2 w-2" /> {c.naProducao}
                        </span>
                      )}
                    </span>
                  )}
                  <span className="flex items-baseline justify-between gap-1">
                    {!compacto && (
                      <span className={cn("text-[10px]", min >= 120 ? "font-semibold text-rose-600" : "text-stone-500")}>{tempo(min)}</span>
                    )}
                    <span className={cn("font-bold tabular-nums", compacto ? "text-[11px]" : "text-sm")}>
                      {brl(centavos(c.total))}
                    </span>
                  </span>
                </span>
              ) : (
                <span className="truncate text-[10px] font-medium text-stone-500">
                  {m.aLiberar ? "toque p/ liberar" : "toque p/ abrir"}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---- avisos (chamados do QR e pedidos do cliente) -----------------------------------

function Avisos({
  chamados,
  solicitacoes,
  agora,
  onAbrirComanda,
  onAtenderChamado,
}: {
  chamados: ChamadoPainel[]
  solicitacoes: SolicitacaoPainel[]
  agora: number
  onAbrirComanda: (id: string) => void
  onAtenderChamado: (id: string) => void
}) {
  return (
    <>
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
    </>
  )
}

// ---- cartão grande (modo lista e mesas sem posição) ---------------------------------

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
  const e = estadoDaMesa(mesa)

  return (
    <div className={cn("flex min-h-[116px] flex-col justify-between rounded-2xl p-3 shadow-sm ring-1", e.cls)}>
      <button
        type="button"
        disabled={ocupado}
        onClick={() => (c ? onAbrirComanda(c.id) : onAbrirMesaLivre(mesa.nome))}
        className="flex-1 text-left"
      >
        <p className="flex items-center gap-1.5 text-base font-bold leading-tight">
          {rotuloMesa(mesa.nome)}
          {e.label && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold">
              {e.Icone && <e.Icone className="h-3 w-3" />} {e.label}
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
