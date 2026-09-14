"use client"

import { Check, Minus, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  calcularDivisao,
  limparPlano,
  MAX_PESSOAS,
  type LinhaDivisao,
  type ModoDivisao,
  type PlanoDivisao,
} from "@/lib/gestao/divisao"
import { brl, centavos, parseReais, reaisInput } from "./tipos"

export interface LinhaDivisaoPdv extends LinhaDivisao {
  titulo: string
  detalhe: string | null
}

const MODOS: { modo: ModoDivisao; label: string }[] = [
  { modo: "igual", label: "Igual" },
  { modo: "itens", label: "Por itens" },
  { modo: "valor", label: "Por valor" },
]

// Divisão da conta: quem são as pessoas, quanto cabe a cada uma (igual, pelos
// itens que consumiu ou por valor combinado) e quanto cada uma já pagou. "Cobrar"
// leva o valor e o nome da pessoa para o formulário de pagamento.
export function DivisaoPainel({
  plano,
  onChange,
  totalC,
  linhas,
  pagoPorPagante,
  onCobrar,
}: {
  plano: PlanoDivisao
  onChange: (p: PlanoDivisao) => void
  totalC: number
  linhas: LinhaDivisaoPdv[]
  pagoPorPagante: Record<string, number>
  onCobrar: (nome: string, valorC: number) => void
}) {
  const r = calcularDivisao(plano, { totalC, linhas })
  const chaves = linhas.map((l) => l.chave)

  function adicionarPessoa() {
    if (plano.pessoas.length >= MAX_PESSOAS) return
    const n = plano.pessoas.length + 1
    const id = `p${Date.now().toString(36)}${n}`
    onChange({ ...plano, pessoas: [...plano.pessoas, { id, nome: `Pessoa ${n}` }] })
  }

  function removerPessoa(id: string) {
    if (plano.pessoas.length <= 1) return
    onChange(limparPlano({ ...plano, pessoas: plano.pessoas.filter((p) => p.id !== id) }, chaves))
  }

  function partesDe(l: LinhaDivisaoPdv): string[][] {
    const p = plano.itens[l.chave]
    return p && p.length > 0 ? p : [[]]
  }

  function setPartes(chave: string, partes: string[][]) {
    onChange({ ...plano, itens: { ...plano.itens, [chave]: partes } })
  }

  function alternar(l: LinhaDivisaoPdv, parteIdx: number, pessoaId: string) {
    const partes = partesDe(l).map((x) => [...x])
    const parte = partes[parteIdx]
    partes[parteIdx] = parte.includes(pessoaId) ? parte.filter((x) => x !== pessoaId) : [...parte, pessoaId]
    setPartes(l.chave, partes)
  }

  function porUnidade(l: LinhaDivisaoPdv, ligar: boolean) {
    const atuais = partesDe(l)
    if (ligar) {
      const todos = [...new Set(atuais.flat())]
      setPartes(l.chave, Array.from({ length: l.quantidade }, () => [...todos]))
    } else {
      setPartes(l.chave, [[...new Set(atuais.flat())]])
    }
  }

  const chip = (on: boolean) =>
    cn("rounded-full px-2.5 py-1 text-xs font-medium ring-1", on ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-600 ring-stone-300 hover:ring-stone-500")

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl bg-stone-100 p-1">
        {MODOS.map((m) => (
          <button
            key={m.modo}
            type="button"
            onClick={() => onChange({ ...plano, modo: m.modo })}
            className={cn("flex-1 rounded-lg py-2 text-sm font-medium", plano.modo === m.modo ? "bg-white shadow-sm" : "text-stone-600")}
          >
            {m.label}
          </button>
        ))}
      </div>

      {plano.modo === "igual" && (
        <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
          <span className="text-sm font-medium">Pessoas</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Menos uma pessoa" onClick={() => removerPessoa(plano.pessoas[plano.pessoas.length - 1].id)} disabled={plano.pessoas.length <= 1} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white ring-1 ring-stone-300 disabled:opacity-40">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-lg font-bold tabular-nums">{plano.pessoas.length}</span>
            <button type="button" aria-label="Mais uma pessoa" onClick={adicionarPessoa} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white ring-1 ring-stone-300">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {plano.modo === "itens" && (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {linhas.map((l) => {
            const partes = partesDe(l)
            const unidade = partes.length > 1
            return (
              <li key={l.chave} className="rounded-xl bg-stone-50 p-2.5">
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium tabular-nums">{l.quantidade}×</span> {l.titulo}
                    {l.detalhe && <span className="text-stone-500"> · {l.detalhe}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-stone-600">{brl(l.valorC)}</span>
                </div>
                {l.quantidade > 1 && l.quantidade <= 30 && (
                  <label className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                    <input type="checkbox" checked={unidade} onChange={(e) => porUnidade(l, e.target.checked)} />
                    Separar por unidade
                  </label>
                )}
                <div className="mt-1.5 space-y-1.5">
                  {partes.map((parte, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-1">
                      {unidade && <span className="w-6 text-xs tabular-nums text-stone-500">{idx + 1}.</span>}
                      {plano.pessoas.map((p) => (
                        <button key={p.id} type="button" onClick={() => alternar(l, idx, p.id)} className={chip(parte.includes(p.id))}>
                          {p.nome}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const nova = partes.map((x) => [...x])
                          nova[idx] = parte.length === plano.pessoas.length ? [] : plano.pessoas.map((p) => p.id)
                          setPartes(l.chave, nova)
                        }}
                        className="px-1.5 text-xs font-medium text-stone-500 underline"
                      >
                        {parte.length === plano.pessoas.length ? "ninguém" : "todos"}
                      </button>
                    </div>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ul className="space-y-2">
        {plano.pessoas.map((p) => {
          const parteC = r.porPessoa[p.id] ?? 0
          const pagoC = pagoPorPagante[p.nome] ?? 0
          const faltaC = Math.max(parteC - pagoC, 0)
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-stone-200">
              <input
                value={p.nome}
                onChange={(e) => onChange({ ...plano, pessoas: plano.pessoas.map((x) => (x.id === p.id ? { ...x, nome: e.target.value.slice(0, 60) } : x)) })}
                aria-label="Nome da pessoa"
                className="h-9 w-28 min-w-0 flex-1 rounded-lg border border-transparent px-2 text-[16px] font-medium hover:border-stone-200 focus:border-stone-400"
              />
              {plano.modo === "valor" ? (
                <input
                  defaultValue={plano.valores[p.id] ? reaisInput(plano.valores[p.id]) : ""}
                  onBlur={(e) => {
                    const v = parseReais(e.target.value)
                    onChange({ ...plano, valores: { ...plano.valores, [p.id]: v > 0 ? centavos(v) : 0 } })
                  }}
                  inputMode="decimal"
                  placeholder="R$"
                  className="h-9 w-24 rounded-lg border border-stone-300 px-2 text-right text-[16px] tabular-nums"
                />
              ) : (
                <span className="w-24 text-right text-sm font-semibold tabular-nums">{brl(parteC)}</span>
              )}
              {pagoC > 0 && faltaC === 0 ? (
                <span className="flex w-28 items-center justify-center gap-1 text-xs font-semibold text-emerald-700">
                  <Check className="h-3.5 w-3.5" /> Pago
                </span>
              ) : (
                <button
                  type="button"
                  disabled={faltaC <= 0}
                  onClick={() => onCobrar(p.nome, faltaC)}
                  className="h-9 w-28 rounded-lg bg-stone-900 px-2 text-xs font-semibold text-white disabled:opacity-30"
                >
                  Cobrar {brl(faltaC)}
                </button>
              )}
              {plano.pessoas.length > 1 && plano.modo !== "igual" && (
                <button type="button" aria-label={`Remover ${p.nome}`} onClick={() => removerPessoa(p.id)} className="text-stone-400 hover:text-rose-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {plano.modo !== "igual" && (
        <button type="button" onClick={adicionarPessoa} disabled={plano.pessoas.length >= MAX_PESSOAS} className="flex items-center gap-1 text-sm font-medium text-stone-700 disabled:opacity-40">
          <Plus className="h-4 w-4" /> Adicionar pessoa
        </button>
      )}

      {r.naoAtribuidoC !== 0 && (
        <p className={cn("rounded-lg px-3 py-2 text-sm", r.naoAtribuidoC > 0 ? "bg-amber-50 text-amber-900" : "bg-rose-50 text-rose-800")}>
          {plano.modo === "itens"
            ? `${brl(r.naoAtribuidoC)} em itens sem ninguém — toque nas pessoas de cada item.`
            : r.naoAtribuidoC > 0
              ? `Faltam ${brl(r.naoAtribuidoC)} para fechar o total.`
              : `Os valores passam ${brl(-r.naoAtribuidoC)} do total.`}
        </p>
      )}
    </div>
  )
}
