"use client"

import { useRef, useState } from "react"
import { Loader2, Split, Trash2, Undo2, User } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FORMAS_PAGAMENTO, formaPagamentoLabel } from "@/lib/hospedagem"
import { planoPadrao, type PlanoDivisao } from "@/lib/gestao/divisao"
import { cn } from "@/lib/utils"
import { DivisaoPainel, type LinhaDivisaoPdv } from "./divisao-painel"
import { brl, centavos, parseReais, reaisInput, type PagamentoLocal } from "./tipos"

const NOTAS = [2000, 5000, 10000, 20000]

// Recebimento da venda ou da comanda: várias formas de pagamento na mesma conta,
// troco em dinheiro e divisão entre pessoas.
// - venda: os pagamentos ficam aqui até "Finalizar" (a venda é gravada de uma vez);
// - comanda: cada pagamento vai para o servidor na hora (pagamento parcial — a
//   pessoa paga e vai embora) e a comanda fecha quando o saldo zera.
export function PagamentoDialog({
  open,
  onOpenChange,
  modo,
  titulo,
  totalC,
  pagamentosComanda = [],
  linhas,
  planoInicial,
  onPlano,
  onFinalizarVenda,
  onPagarComanda,
  onEstornar,
  podeCancelar,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  modo: "venda" | "comanda"
  titulo: string
  totalC: number
  pagamentosComanda?: PagamentoLocal[]
  linhas: LinhaDivisaoPdv[]
  planoInicial: PlanoDivisao | null
  onPlano?: (p: PlanoDivisao | null) => void
  onFinalizarVenda?: (pagamentos: PagamentoLocal[]) => Promise<boolean>
  onPagarComanda?: (p: PagamentoLocal, fechar: boolean) => Promise<boolean>
  onEstornar?: (id: string, motivo: string) => Promise<boolean>
  podeCancelar: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto sm:max-w-3xl">
        {open && (
          <Conteudo
            modo={modo}
            titulo={titulo}
            totalC={totalC}
            pagamentosComanda={pagamentosComanda}
            linhas={linhas}
            planoInicial={planoInicial}
            onPlano={onPlano}
            onFinalizarVenda={onFinalizarVenda}
            onPagarComanda={onPagarComanda}
            onEstornar={onEstornar}
            podeCancelar={podeCancelar}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Conteudo({
  modo,
  titulo,
  totalC,
  pagamentosComanda,
  linhas,
  planoInicial,
  onPlano,
  onFinalizarVenda,
  onPagarComanda,
  onEstornar,
  podeCancelar,
}: Omit<Parameters<typeof PagamentoDialog>[0], "open" | "onOpenChange"> & { pagamentosComanda: PagamentoLocal[] }) {
  const [locais, setLocais] = useState<PagamentoLocal[]>([])
  const [plano, setPlano] = useState<PlanoDivisao | null>(planoInicial)
  const [forma, setForma] = useState("pix")
  const [recebido, setRecebido] = useState("")
  const [pagante, setPagante] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [estornando, setEstornando] = useState<{ id: string; motivo: string } | null>(null)
  const valorRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  const pagamentos = modo === "venda" ? locais : pagamentosComanda
  const ativos = pagamentos.filter((p) => !p.estornado)
  const pagoC = ativos.reduce((a, p) => a + p.valorC, 0)
  const faltaC = Math.max(totalC - pagoC, 0)

  // O valor sugerido acompanha o que falta (depois de cada pagamento): ajuste de
  // estado durante a renderização quando `faltaC` muda, sem efeito.
  const [valor, setValor] = useState(faltaC > 0 ? reaisInput(faltaC) : "")
  const [faltaVista, setFaltaVista] = useState(faltaC)
  if (faltaVista !== faltaC) {
    setFaltaVista(faltaC)
    setValor(faltaC > 0 ? reaisInput(faltaC) : "")
    setRecebido("")
    setPagante(null)
  }

  const pagoPorPagante: Record<string, number> = {}
  for (const p of ativos) if (p.pagante) pagoPorPagante[p.pagante] = (pagoPorPagante[p.pagante] ?? 0) + p.valorC

  const valorC = centavos(parseReais(valor) || 0)
  const recebidoNum = parseReais(recebido)
  const recebidoC = forma === "dinheiro" && recebido.trim() && recebidoNum > 0 ? centavos(recebidoNum) : null
  const trocoC = recebidoC != null ? recebidoC - valorC : null
  const valorInvalido = !(valorC > 0) || valorC > faltaC || (recebidoC != null && recebidoC < valorC)
  const trocoTotalC = ativos.reduce((a, p) => a + (p.recebidoC != null ? p.recebidoC - p.valorC : 0), 0)

  function mudarPlano(p: PlanoDivisao | null) {
    setPlano(p)
    onPlano?.(p)
  }

  async function adicionar() {
    if (valorInvalido || ocupado) return
    const novo: PagamentoLocal = { id: `l${++seq.current}`, forma, valorC, recebidoC, pagante }
    if (modo === "venda") {
      setLocais((ls) => [...ls, novo])
      return
    }
    setOcupado(true)
    try {
      await onPagarComanda?.(novo, valorC === faltaC)
    } finally {
      setOcupado(false)
    }
  }

  async function finalizar() {
    if (ocupado) return
    setOcupado(true)
    try {
      // Atalho: com o formulário já preenchido com o total, finaliza direto.
      const lista = faltaC > 0 && !valorInvalido && valorC === faltaC ? [...locais, { id: `l${++seq.current}`, forma, valorC, recebidoC, pagante }] : locais
      await onFinalizarVenda?.(lista)
    } finally {
      setOcupado(false)
    }
  }

  const podeFinalizarVenda = modo === "venda" && (faltaC === 0 || (!valorInvalido && valorC === faltaC))

  return (
    <>
      <DialogHeader>
        <DialogTitle>{titulo}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Resumo label="Total" valor={brl(totalC)} />
        <Resumo label="Pago" valor={brl(pagoC)} />
        <Resumo label="Falta" valor={brl(faltaC)} destaque={faltaC > 0} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Divisão */}
        <section className="space-y-3">
          {plano ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Split className="h-4 w-4" /> Dividir conta</h3>
                <button type="button" onClick={() => mudarPlano(null)} className="text-xs font-medium text-stone-500 underline">Sem divisão</button>
              </div>
              <DivisaoPainel
                plano={plano}
                onChange={mudarPlano}
                totalC={totalC}
                linhas={linhas}
                pagoPorPagante={pagoPorPagante}
                onCobrar={(nome, c) => {
                  setPagante(nome)
                  setValor(reaisInput(Math.min(c, faltaC)))
                  setRecebido("")
                  valorRef.current?.focus()
                }}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => mudarPlano(planoPadrao(2))}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 py-6 text-sm font-medium text-stone-600 hover:border-stone-500"
            >
              <Split className="h-4 w-4" /> Dividir a conta entre pessoas
            </button>
          )}

          {pagamentos.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold">Pagamentos</h3>
              <ul className="divide-y divide-stone-100 rounded-xl ring-1 ring-stone-200">
                {pagamentos.map((p) => (
                  <li key={p.id} className={cn("flex items-center gap-2 px-3 py-2 text-sm", p.estornado && "text-stone-400 line-through")}>
                    <span className="min-w-0 flex-1">
                      {formaPagamentoLabel(p.forma)}
                      {p.pagante && <span className="text-stone-500"> · {p.pagante}</span>}
                      {p.recebidoC != null && p.recebidoC > p.valorC && <span className="block text-xs text-stone-500">recebeu {brl(p.recebidoC)} · troco {brl(p.recebidoC - p.valorC)}</span>}
                    </span>
                    <span className="font-semibold tabular-nums">{brl(p.valorC)}</span>
                    {modo === "venda" ? (
                      <button type="button" aria-label="Remover pagamento" onClick={() => setLocais((ls) => ls.filter((x) => x.id !== p.id))} className="text-stone-400 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : !p.estornado && podeCancelar ? (
                      <button type="button" aria-label="Estornar pagamento" onClick={() => setEstornando({ id: p.id, motivo: "" })} className="text-stone-400 hover:text-rose-600">
                        <Undo2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {estornando && (
                <div className="flex gap-2 rounded-lg bg-rose-50 p-2">
                  <input autoFocus value={estornando.motivo} onChange={(e) => setEstornando({ ...estornando, motivo: e.target.value })} placeholder="Motivo do estorno" className="h-9 min-w-0 flex-1 rounded-md border border-rose-200 bg-white px-2 text-[16px]" />
                  <button
                    type="button"
                    disabled={estornando.motivo.trim().length < 3 || ocupado}
                    onClick={async () => {
                      setOcupado(true)
                      try {
                        if (await onEstornar?.(estornando.id, estornando.motivo.trim())) setEstornando(null)
                      } finally {
                        setOcupado(false)
                      }
                    }}
                    className="rounded-md bg-rose-600 px-3 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Estornar
                  </button>
                  <button type="button" onClick={() => setEstornando(null)} className="px-2 text-sm text-stone-600">Voltar</button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Recebimento */}
        <section className="space-y-3">
          {faltaC > 0 ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (modo === "venda" && podeFinalizarVenda && locais.length === 0) finalizar()
                else adicionar()
              }}
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FORMAS_PAGAMENTO.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setForma(f.key)}
                    className={cn("h-12 rounded-xl px-2 text-sm font-semibold ring-1", forma === f.key ? "bg-stone-900 text-white ring-stone-900" : "bg-white ring-stone-300 hover:ring-stone-500")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="flex items-center justify-between text-xs font-medium text-stone-600">
                  Valor
                  {pagante && (
                    <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">
                      <User className="h-3 w-3" /> {pagante}
                      <button type="button" aria-label="Tirar pessoa" onClick={() => setPagante(null)} className="ml-0.5">×</button>
                    </span>
                  )}
                </label>
                <input ref={valorRef} value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className="h-12 w-full rounded-xl border border-stone-300 px-3 text-right text-xl font-bold tabular-nums" />
                {valorC > faltaC && <p className="text-xs text-rose-600">Maior que o que falta ({brl(faltaC)}).</p>}
              </div>

              {forma === "dinheiro" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-600">Recebido em dinheiro</label>
                  <input value={recebido} onChange={(e) => setRecebido(e.target.value)} inputMode="decimal" placeholder={valor || "R$"} className="h-11 w-full rounded-xl border border-stone-300 px-3 text-right text-lg tabular-nums" />
                  <div className="flex flex-wrap gap-1.5">
                    {NOTAS.filter((n) => n > valorC).slice(0, 3).map((n) => (
                      <button key={n} type="button" onClick={() => setRecebido(reaisInput(n))} className="rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-medium hover:bg-stone-200">
                        {brl(n)}
                      </button>
                    ))}
                  </div>
                  {trocoC != null && trocoC >= 0 && (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-lg font-bold text-emerald-800">Troco: {brl(trocoC)}</p>
                  )}
                  {trocoC != null && trocoC < 0 && <p className="text-xs text-rose-600">Recebido menor que o valor.</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={valorInvalido || ocupado}
                className={cn(
                  "flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold disabled:opacity-40",
                  modo === "comanda" || locais.length > 0 || valorC !== faltaC ? "bg-stone-900 text-white" : "bg-white ring-1 ring-stone-300",
                )}
              >
                {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
                {modo === "comanda"
                  ? valorC === faltaC
                    ? `Receber ${brl(valorC)} e fechar a comanda`
                    : `Receber ${brl(valorC || 0)}`
                  : `Adicionar ${brl(valorC || 0)}`}
              </button>
            </form>
          ) : (
            <div className="rounded-xl bg-emerald-50 p-4 text-center text-emerald-900">
              <p className="font-semibold">Conta paga</p>
              {trocoTotalC > 0 && <p className="mt-1 text-2xl font-bold">Troco: {brl(trocoTotalC)}</p>}
            </div>
          )}

          {modo === "venda" && (
            <button
              type="button"
              disabled={!podeFinalizarVenda || ocupado}
              onClick={finalizar}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-lg font-bold text-white disabled:opacity-40"
            >
              {ocupado && <Loader2 className="h-5 w-5 animate-spin" />}
              Finalizar venda
            </button>
          )}
        </section>
      </div>
    </>
  )
}

function Resumo({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={cn("rounded-xl p-3", destaque ? "bg-amber-50 text-amber-900" : "bg-stone-50")}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{valor}</p>
    </div>
  )
}
