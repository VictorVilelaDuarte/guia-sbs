"use client"

import { useEffect, useState } from "react"
import { Phone, Store, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { brl, centavos, parseReais, reaisInput, type DescontoInput, type ZonaPdv } from "./tipos"

const campo = "h-11 w-full rounded-lg border border-stone-300 px-3 text-[16px]"

// ---- Desconto na conta ------------------------------------------------------------

export function DescontoDialog({
  open,
  onOpenChange,
  inicial,
  baseC,
  onSalvar,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  inicial: DescontoInput | null
  baseC: number // subtotal (já com descontos por item)
  onSalvar: (d: DescontoInput | null) => void | Promise<void>
}) {
  const [tipo, setTipo] = useState<"valor" | "percentual">(inicial?.tipo ?? "percentual")
  const [valor, setValor] = useState(inicial ? (inicial.tipo === "valor" ? reaisInput(centavos(inicial.valor)) : String(inicial.valor).replace(".", ",")) : "")
  const n = parseReais(valor)
  const descontoC = !(n > 0) ? 0 : tipo === "percentual" ? Math.round((baseC * Math.min(n, 100)) / 100) : centavos(n)
  const invalido = (tipo === "percentual" && n > 100) || descontoC > baseC

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Desconto na conta</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (invalido) return
            await onSalvar(n > 0 ? { tipo, valor: n } : null)
          }}
        >
          <div className="flex rounded-xl bg-stone-100 p-1">
            {(["percentual", "valor"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)} className={cn("flex-1 rounded-lg py-2 text-sm font-medium", tipo === t ? "bg-white shadow-sm" : "text-stone-600")}>
                {t === "percentual" ? "Percentual (%)" : "Valor (R$)"}
              </button>
            ))}
          </div>
          <input autoFocus value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder={tipo === "percentual" ? "10" : "5,00"} className={cn(campo, "text-right text-xl font-bold")} />
          {tipo === "percentual" && (
            <div className="flex gap-1.5">
              {[5, 10, 15, 20].map((p) => (
                <button key={p} type="button" onClick={() => setValor(String(p))} className="flex-1 rounded-lg bg-stone-100 py-1.5 text-sm font-medium hover:bg-stone-200">{p}%</button>
              ))}
            </div>
          )}
          <p className="text-sm text-stone-600">
            Desconto de <strong className="tabular-nums">{brl(Math.min(descontoC, baseC))}</strong> sobre {brl(baseC)}
          </p>
          {invalido && <p className="text-xs text-rose-600">Desconto maior que a conta.</p>}
          <div className="flex gap-2">
            {inicial && (
              <button type="button" onClick={() => onSalvar(null)} className="h-11 rounded-lg px-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
                Tirar desconto
              </button>
            )}
            <button type="submit" disabled={invalido} className="h-11 flex-1 rounded-lg bg-stone-900 font-semibold text-white disabled:opacity-40">
              Aplicar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---- Cliente, origem e entrega da venda rápida -----------------------------------

export interface ClientePdv {
  id: string
  nome: string
  whatsapp: string | null
}

export interface DadosVenda {
  origem: "BALCAO" | "TELEFONE"
  cliente: ClientePdv | null
  clienteNome: string
  clienteWhats: string
  entrega: boolean
  endereco: string
  numeroEnd: string
  complemento: string
  referencia: string
  zonaId: string
  fila: boolean
  observacoes: string
}

export const DADOS_VENDA_VAZIOS: DadosVenda = {
  origem: "BALCAO",
  cliente: null,
  clienteNome: "",
  clienteWhats: "",
  entrega: false,
  endereco: "",
  numeroEnd: "",
  complemento: "",
  referencia: "",
  zonaId: "",
  fila: false,
  observacoes: "",
}

// Busca de clientes cadastrados (autocomplete) — só com a flag de clientes.
export function useBuscaClientes(ativo: boolean, termo: string) {
  const [sugestoes, setSugestoes] = useState<ClientePdv[]>([])
  useEffect(() => {
    if (!ativo || termo.trim().length < 2) return
    const t = setTimeout(async () => {
      const r = await fetch(`/api/comerciante/gestao/clientes/busca?q=${encodeURIComponent(termo.trim())}`).catch(() => null)
      if (r?.ok) setSugestoes(await r.json())
    }, 300)
    return () => clearTimeout(t)
  }, [ativo, termo])
  return termo.trim().length < 2 ? [] : sugestoes
}

export function ClienteVendaDialog({
  open,
  onOpenChange,
  dados,
  onSalvar,
  zonas,
  temPedidoOnline,
  buscaClientes,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  dados: DadosVenda
  onSalvar: (d: DadosVenda) => void
  zonas: ZonaPdv[]
  temPedidoOnline: boolean
  buscaClientes: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cliente e entrega</DialogTitle>
        </DialogHeader>
        {open && <FormCliente inicial={dados} onSalvar={onSalvar} zonas={zonas} temPedidoOnline={temPedidoOnline} buscaClientes={buscaClientes} />}
      </DialogContent>
    </Dialog>
  )
}

function FormCliente({ inicial, onSalvar, zonas, temPedidoOnline, buscaClientes }: {
  inicial: DadosVenda
  onSalvar: (d: DadosVenda) => void
  zonas: ZonaPdv[]
  temPedidoOnline: boolean
  buscaClientes: boolean
}) {
  const [d, setD] = useState(inicial)
  const [focoNome, setFocoNome] = useState(false)
  const sugestoes = useBuscaClientes(buscaClientes && !d.cliente && focoNome, d.clienteNome)
  const set = (p: Partial<DadosVenda>) => setD((x) => ({ ...x, ...p }))
  const toggle = (on: boolean) => cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold", on ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700")

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSalvar(d)
      }}
    >
      <div className="flex gap-2">
        <button type="button" className={toggle(d.origem === "BALCAO")} onClick={() => set({ origem: "BALCAO", entrega: false, fila: false })}>
          <Store className="h-4 w-4" /> Balcão
        </button>
        <button type="button" className={toggle(d.origem === "TELEFONE")} onClick={() => set({ origem: "TELEFONE" })}>
          <Phone className="h-4 w-4" /> Telefone
        </button>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Cliente <span className="font-normal text-stone-500">(opcional)</span></h3>
        {d.cliente ? (
          <p className="flex items-center justify-between rounded-lg bg-stone-100 px-3 py-2.5 text-sm">
            <span><span className="font-medium">{d.cliente.nome}</span>{d.cliente.whatsapp && <span className="text-stone-500"> · {d.cliente.whatsapp}</span>}</span>
            <button type="button" aria-label="Trocar cliente" onClick={() => set({ cliente: null })}><X className="h-4 w-4" /></button>
          </p>
        ) : (
          <>
            <div className="relative">
              <input
                value={d.clienteNome}
                onChange={(e) => set({ clienteNome: e.target.value })}
                onFocus={() => setFocoNome(true)}
                placeholder={buscaClientes ? "Nome (busca clientes cadastrados)" : "Nome"}
                maxLength={120}
                className={campo}
              />
              {sugestoes.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full divide-y divide-stone-100 rounded-lg bg-white shadow-lg ring-1 ring-stone-200">
                  {sugestoes.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="w-full px-3 py-2.5 text-left text-sm hover:bg-stone-50" onClick={() => { set({ cliente: s }); setFocoNome(false) }}>
                        {s.nome}{s.whatsapp && <span className="text-stone-500"> · {s.whatsapp}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input value={d.clienteWhats} onChange={(e) => set({ clienteWhats: e.target.value })} placeholder="WhatsApp (cadastra o cliente)" inputMode="tel" className={campo} />
          </>
        )}
      </section>

      {d.origem === "TELEFONE" && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Entrega</h3>
          <div className="flex gap-2">
            <button type="button" className={toggle(!d.entrega)} onClick={() => set({ entrega: false })}>Retirada</button>
            <button type="button" className={toggle(d.entrega)} onClick={() => set({ entrega: true })} disabled={zonas.length === 0}>Entrega</button>
          </div>
          {zonas.length === 0 && <p className="text-xs text-stone-500">Cadastre bairros de entrega em Pedidos para lançar entregas.</p>}
          {d.entrega && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={d.endereco} onChange={(e) => set({ endereco: e.target.value })} placeholder="Rua" className={cn(campo, "sm:col-span-2")} />
              <input value={d.numeroEnd} onChange={(e) => set({ numeroEnd: e.target.value })} placeholder="Número" className={campo} />
              <select value={d.zonaId} onChange={(e) => set({ zonaId: e.target.value })} className={cn(campo, "bg-white")}>
                <option value="">Bairro</option>
                {zonas.map((z) => <option key={z.id} value={z.id}>{z.nome} · {brl(centavos(z.taxa))}</option>)}
              </select>
              <input value={d.complemento} onChange={(e) => set({ complemento: e.target.value })} placeholder="Complemento" className={campo} />
              <input value={d.referencia} onChange={(e) => set({ referencia: e.target.value })} placeholder="Referência" className={campo} />
            </div>
          )}
          {temPedidoOnline && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.fila} onChange={(e) => set({ fila: e.target.checked })} className="h-4 w-4" />
              Enviar para a fila de pedidos (em vez de concluir na hora)
            </label>
          )}
        </section>
      )}

      <input value={d.observacoes} onChange={(e) => set({ observacoes: e.target.value })} placeholder="Observações da venda (opcional)" maxLength={500} className={campo} />

      <button type="submit" className="h-12 w-full rounded-xl bg-stone-900 font-semibold text-white">Salvar</button>
    </form>
  )
}
