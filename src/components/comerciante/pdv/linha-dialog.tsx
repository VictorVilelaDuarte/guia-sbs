"use client"

import { useState } from "react"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { brl, parseReais, centavos, reaisInput } from "./tipos"

export interface LinhaEditavel {
  titulo: string
  detalhe: string | null
  precoC: number
  quantidade: number
  observacao: string | null
  descontoC: number
  enviado?: boolean // comanda: já foi para a produção
}

export interface EdicaoLinha {
  quantidade: number
  observacao: string | null
  descontoC: number
  motivo: string | null
}

// Editar uma linha da venda/comanda: quantidade, observação para a produção e
// desconto no item (R$ ou %). Reduzir ou tirar item já enviado pede motivo e
// permissão de cancelamento — a checagem real é do servidor.
export function LinhaDialog({
  linha,
  podeDesconto,
  podeCancelar,
  onClose,
  onSalvar,
  onRemover,
}: {
  linha: LinhaEditavel | null
  podeDesconto: boolean
  podeCancelar: boolean
  onClose: () => void
  onSalvar: (e: EdicaoLinha) => void | Promise<void>
  onRemover: (motivo: string | null) => void | Promise<void>
}) {
  return (
    <Dialog open={!!linha} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {linha && (
          <Conteudo
            key={`${linha.titulo}:${linha.quantidade}:${linha.descontoC}`}
            linha={linha}
            podeDesconto={podeDesconto}
            podeCancelar={podeCancelar}
            onSalvar={onSalvar}
            onRemover={onRemover}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Conteudo({
  linha,
  podeDesconto,
  podeCancelar,
  onSalvar,
  onRemover,
}: {
  linha: LinhaEditavel
  podeDesconto: boolean
  podeCancelar: boolean
  onSalvar: (e: EdicaoLinha) => void | Promise<void>
  onRemover: (motivo: string | null) => void | Promise<void>
}) {
  const [quantidade, setQuantidade] = useState(linha.quantidade)
  const [observacao, setObservacao] = useState(linha.observacao ?? "")
  const [tipoDesc, setTipoDesc] = useState<"valor" | "percentual">("valor")
  const [desconto, setDesconto] = useState(linha.descontoC > 0 ? reaisInput(linha.descontoC) : "")
  const [motivo, setMotivo] = useState("")
  const [ocupado, setOcupado] = useState(false)

  const brutoC = linha.precoC * quantidade
  const descNum = parseReais(desconto)
  const descontoC = !desconto.trim() || !(descNum > 0) ? 0 : tipoDesc === "percentual" ? Math.round((brutoC * Math.min(descNum, 100)) / 100) : centavos(descNum)
  const descontoInvalido = descontoC > brutoC
  const reduzEnviado = !!linha.enviado && quantidade < linha.quantidade
  const precisaMotivo = !!linha.enviado
  const bloqueadoCancelar = !!linha.enviado && !podeCancelar

  async function executar(fn: () => void | Promise<void>) {
    setOcupado(true)
    try {
      await fn()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {linha.titulo}
          {linha.detalhe && <span className="font-normal text-stone-500"> · {linha.detalhe}</span>}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-600">{brl(linha.precoC)} cada</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Diminuir" disabled={quantidade <= 1 || (reduzEnviado && bloqueadoCancelar)} onClick={() => setQuantidade((q) => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center rounded-lg ring-1 ring-stone-300 disabled:opacity-40">
              <Minus className="h-4 w-4" />
            </button>
            <input
              value={quantidade}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ""))
                if (n >= 1 && n <= 999) setQuantidade(n)
              }}
              inputMode="numeric"
              className="h-10 w-14 rounded-lg border border-stone-300 text-center text-[16px] font-semibold tabular-nums"
            />
            <button type="button" aria-label="Aumentar" onClick={() => setQuantidade((q) => Math.min(999, q + 1))} className="flex h-10 w-10 items-center justify-center rounded-lg ring-1 ring-stone-300">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          maxLength={280}
          placeholder="Observação (ex.: sem cebola)"
          disabled={!!linha.enviado}
          className="h-11 w-full rounded-lg border border-stone-300 px-3 text-[16px] disabled:bg-stone-50 disabled:text-stone-500"
        />

        {podeDesconto && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-stone-600">Desconto no item</p>
            <div className="flex gap-2">
              <div className="flex rounded-lg bg-stone-100 p-0.5 text-sm">
                {(["valor", "percentual"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTipoDesc(t)} className={cn("rounded-md px-3 py-1.5 font-medium", tipoDesc === t ? "bg-white shadow-sm" : "text-stone-600")}>
                    {t === "valor" ? "R$" : "%"}
                  </button>
                ))}
              </div>
              <input value={desconto} onChange={(e) => setDesconto(e.target.value)} inputMode="decimal" placeholder="0" className="h-10 min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-[16px]" />
            </div>
            {descontoInvalido && <p className="text-xs text-rose-600">Desconto maior que o valor do item.</p>}
          </div>
        )}

        {precisaMotivo && (
          <div className="space-y-1.5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p>Este item já foi para a produção. {podeCancelar ? "Para reduzir ou tirar, informe o motivo." : "Só dono ou gerente reduz ou tira."}</p>
            {podeCancelar && (
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" maxLength={280} className="h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-[16px]" />
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="text-sm">
            Total do item: <strong className="tabular-nums">{brl(Math.max(brutoC - (descontoInvalido ? 0 : descontoC), 0))}</strong>
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={ocupado || bloqueadoCancelar || (precisaMotivo && motivo.trim().length < 3)}
            onClick={() => executar(() => onRemover(precisaMotivo ? motivo.trim() : null))}
            className="flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> Tirar
          </button>
          <button
            type="button"
            disabled={ocupado || descontoInvalido || (reduzEnviado && (bloqueadoCancelar || motivo.trim().length < 3))}
            onClick={() => executar(() => onSalvar({ quantidade, observacao: observacao.trim() || null, descontoC: podeDesconto ? descontoC : linha.descontoC, motivo: reduzEnviado ? motivo.trim() : null }))}
            className="h-11 flex-1 rounded-lg bg-stone-900 font-semibold text-white disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      </div>
    </>
  )
}
