"use client"

import type { ReactNode } from "react"
import { Minus, Plus, Percent, ShoppingBasket } from "lucide-react"
import { cn } from "@/lib/utils"
import { brl } from "./tipos"

export interface LinhaConta {
  chave: string
  titulo: string
  detalhe: string | null
  precoC: number
  quantidade: number
  observacao: string | null
  descontoC: number
  estado?: "novo" | "aguardando" | "lancado" | "producao" | "pronto"
  extras?: string[] // complementos escolhidos
}

const ESTADO: Record<NonNullable<LinhaConta["estado"]>, { label: string; cls: string } | null> = {
  novo: { label: "a lançar", cls: "bg-amber-100 text-amber-800" },
  aguardando: { label: "pedido do cliente", cls: "bg-violet-100 text-violet-800" },
  lancado: null,
  producao: { label: "na produção", cls: "bg-sky-100 text-sky-800" },
  pronto: { label: "pronto", cls: "bg-emerald-100 text-emerald-800" },
}

// Painel da conta (venda rápida ou comanda): itens, totais e ações.
export function Conta({
  cabecalho,
  linhas,
  vazio,
  onLinha,
  onQtd,
  subtotalC,
  descontoC,
  servicoC,
  servicoPct,
  entregaC = 0,
  totalC,
  pagoC = 0,
  extraC = 0,
  onDesconto,
  onServico,
  servicoAtivo,
  avisos,
  rodape,
}: {
  cabecalho: ReactNode
  linhas: LinhaConta[]
  vazio: string
  onLinha: (chave: string) => void
  onQtd?: (chave: string, delta: number) => void
  subtotalC: number
  descontoC: number
  servicoC: number
  servicoPct: number | null
  entregaC?: number
  totalC: number
  pagoC?: number
  extraC?: number // itens ainda não lançados na comanda
  onDesconto?: () => void
  onServico?: () => void
  servicoAtivo?: boolean
  avisos?: ReactNode
  rodape: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-stone-200 p-3">{cabecalho}</div>

      {avisos}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {linhas.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-stone-500">
            <ShoppingBasket className="h-8 w-8 text-stone-300" />
            {vazio}
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {linhas.map((l) => {
              const estado = l.estado ? ESTADO[l.estado] : null
              const editavel = !!onQtd && (l.estado === undefined || l.estado === "novo")
              return (
                <li key={l.chave} className="flex items-center gap-2 px-3 py-2.5">
                  <button type="button" onClick={() => onLinha(l.chave)} className="min-w-0 flex-1 text-left">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium leading-snug">
                      {!editavel && <span className="tabular-nums">{l.quantidade}×</span>}
                      <span>{l.titulo}</span>
                      {l.detalhe && <span className="font-normal text-stone-500">· {l.detalhe}</span>}
                      {estado && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", estado.cls)}>{estado.label}</span>}
                    </p>
                    {l.extras && l.extras.length > 0 && <p className="truncate text-xs text-stone-500">+ {l.extras.join(", ")}</p>}
                    {l.observacao && <p className="truncate text-xs italic text-stone-500">↳ {l.observacao}</p>}
                    <p className="text-xs tabular-nums text-stone-500">
                      {brl(l.precoC)} × {l.quantidade}
                      {l.descontoC > 0 && <span className="text-emerald-700"> · −{brl(l.descontoC)}</span>}
                    </p>
                  </button>
                  {editavel && (
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label={`Diminuir ${l.titulo}`} onClick={() => onQtd!(l.chave, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-stone-200 hover:bg-stone-50">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.quantidade}</span>
                      <button type="button" aria-label={`Aumentar ${l.titulo}`} onClick={() => onQtd!(l.chave, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-stone-200 hover:bg-stone-50">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(l.precoC * l.quantidade - l.descontoC)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1 border-t border-stone-200 bg-stone-50 px-3 py-2.5 text-sm">
        <Linha label="Subtotal" valor={brl(subtotalC)} />
        {(descontoC > 0 || onDesconto) && (
          <div className="flex items-center justify-between">
            {onDesconto ? (
              <button type="button" onClick={onDesconto} className="flex items-center gap-1 text-stone-600 underline-offset-2 hover:underline">
                <Percent className="h-3.5 w-3.5" /> Desconto <span className="hidden text-xs text-stone-400 lg:inline">F4</span>
              </button>
            ) : (
              <span className="text-stone-600">Desconto</span>
            )}
            <span className="tabular-nums text-emerald-700">{descontoC > 0 ? `−${brl(descontoC)}` : brl(0)}</span>
          </div>
        )}
        {servicoPct != null && (
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-stone-600">
              {onServico && <input type="checkbox" checked={!!servicoAtivo} onChange={onServico} className="h-4 w-4" />}
              Serviço ({String(servicoPct).replace(".", ",")}%)
            </label>
            <span className="tabular-nums">{brl(servicoC)}</span>
          </div>
        )}
        {entregaC > 0 && <Linha label="Entrega" valor={brl(entregaC)} />}
        {extraC > 0 && <Linha label="A lançar" valor={`+ ${brl(extraC)}`} className="text-amber-700" />}
        {pagoC > 0 && <Linha label="Pago" valor={`− ${brl(pagoC)}`} className="text-emerald-700" />}
        <div className="flex items-end justify-between pt-1">
          <span className="font-semibold">{pagoC > 0 ? "Falta" : "Total"}</span>
          <span className="text-2xl font-bold tabular-nums">{brl(Math.max(totalC - pagoC, 0))}</span>
        </div>
      </div>

      <div className="border-t border-stone-200 p-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
        {rodape}
      </div>
    </div>
  )
}

function Linha({ label, valor, className }: { label: string; valor: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-stone-600">{label}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  )
}
