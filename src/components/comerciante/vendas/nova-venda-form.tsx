"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Minus, Plus, Search, Store, Phone, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { FORMAS_PAGAMENTO } from "@/lib/hospedagem"

export interface ItemCatalogoVenda {
  id: string
  titulo: string
  grupo: string
  preco: number | null // preço vigente (promoção considerada); null quando há variações
  variacoes: { id: string; nome: string; preco: number }[]
}

interface LinhaVenda {
  chave: string
  produtoId: string | null
  variacaoId: string | null
  titulo: string
  detalhe: string | null
  precoUnit: number
  quantidade: number
}

const centavos = (v: number) => Math.round((v + Number.EPSILON) * 100)
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const parseReais = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", "."))
  return Number.isFinite(n) ? n : NaN
}

// Registro de venda de balcão ou telefone, pensado para o celular. O total aqui é
// só exibição — o servidor recalcula tudo (preços do catálogo e taxa da zona).
export function NovaVendaForm({
  itens: catalogo,
  zonas,
  temPedidoOnline,
  buscaClientes,
}: {
  itens: ItemCatalogoVenda[]
  zonas: { id: string; nome: string; taxa: number }[]
  temPedidoOnline: boolean
  buscaClientes: boolean
}) {
  const router = useRouter()
  const [origem, setOrigem] = useState<"BALCAO" | "TELEFONE">("BALCAO")
  const [linhas, setLinhas] = useState<LinhaVenda[]>([])
  const [busca, setBusca] = useState("")
  const [escolhendo, setEscolhendo] = useState<ItemCatalogoVenda | null>(null)
  const [avulso, setAvulso] = useState({ titulo: "", preco: "" })
  const [cliente, setCliente] = useState<{ id: string; nome: string; whatsapp: string | null } | null>(null)
  const [clienteNome, setClienteNome] = useState("")
  const [clienteWhats, setClienteWhats] = useState("")
  const [sugestoes, setSugestoes] = useState<{ id: string; nome: string; whatsapp: string | null }[]>([])
  const [forma, setForma] = useState("pix")
  const [recebido, setRecebido] = useState("")
  const [entrega, setEntrega] = useState(false)
  const [end, setEnd] = useState({ endereco: "", numeroEnd: "", complemento: "", referencia: "", zonaId: "" })
  const [fila, setFila] = useState(false)
  const [observacoes, setObservacoes] = useState("")
  const [salvando, setSalvando] = useState(false)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q ? catalogo.filter((i) => i.titulo.toLowerCase().includes(q)).slice(0, 12) : []
  }, [busca, catalogo])

  // Autocomplete de clientes (só com a flag de clientes): debounce simples.
  useEffect(() => {
    if (!buscaClientes || cliente || clienteNome.trim().length < 2) return
    const t = setTimeout(async () => {
      const r = await fetch(`/api/comerciante/gestao/clientes/busca?q=${encodeURIComponent(clienteNome.trim())}`)
      if (r.ok) setSugestoes(await r.json())
    }, 300)
    return () => clearTimeout(t)
  }, [clienteNome, buscaClientes, cliente])

  function adicionar(item: ItemCatalogoVenda, variacao?: { id: string; nome: string; preco: number }) {
    const chave = `${item.id}:${variacao?.id ?? ""}`
    setLinhas((ls) => {
      const existente = ls.find((l) => l.chave === chave)
      if (existente) return ls.map((l) => (l.chave === chave ? { ...l, quantidade: l.quantidade + 1 } : l))
      return [...ls, { chave, produtoId: item.id, variacaoId: variacao?.id ?? null, titulo: item.titulo, detalhe: variacao?.nome ?? null, precoUnit: variacao?.preco ?? item.preco ?? 0, quantidade: 1 }]
    })
    setEscolhendo(null)
    setBusca("")
  }

  function adicionarAvulso() {
    const preco = parseReais(avulso.preco)
    if (!avulso.titulo.trim() || !(preco > 0)) return toast.error("Informe nome e preço do item avulso.")
    setLinhas((ls) => [...ls, { chave: `avulso:${Date.now()}`, produtoId: null, variacaoId: null, titulo: avulso.titulo.trim(), detalhe: "avulso", precoUnit: preco, quantidade: 1 }])
    setAvulso({ titulo: "", preco: "" })
  }

  const qtd = (chave: string, delta: number) =>
    setLinhas((ls) => ls.flatMap((l) => (l.chave !== chave ? [l] : l.quantidade + delta <= 0 ? [] : [{ ...l, quantidade: l.quantidade + delta }])))

  const subtotalC = linhas.reduce((a, l) => a + centavos(l.precoUnit) * l.quantidade, 0)
  const taxaC = origem === "TELEFONE" && entrega ? centavos(zonas.find((z) => z.id === end.zonaId)?.taxa ?? 0) : 0
  const totalC = subtotalC + taxaC
  const recebidoC = forma === "dinheiro" && recebido ? centavos(parseReais(recebido)) : null
  const trocoC = recebidoC != null && recebidoC >= totalC ? recebidoC - totalC : null

  async function registrar() {
    if (linhas.length === 0) return toast.error("Adicione ao menos um item.")
    setSalvando(true)
    try {
      const comEntrega = origem === "TELEFONE" && entrega
      const res = await fetch("/api/comerciante/gestao/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem,
          itens: linhas.map((l) => l.produtoId
            ? { produtoId: l.produtoId, variacaoId: l.variacaoId, quantidade: l.quantidade }
            : { titulo: l.titulo, precoUnit: l.precoUnit, quantidade: l.quantidade }),
          clienteId: cliente?.id ?? null,
          clienteNome: cliente ? null : clienteNome.trim() || null,
          clienteWhats: cliente ? null : clienteWhats.trim() || null,
          formaPagamento: forma,
          valorRecebido: recebidoC != null ? recebidoC / 100 : null,
          tipoEntrega: comEntrega ? "ENTREGA" : "RETIRADA",
          ...(comEntrega ? { ...end, zonaId: end.zonaId || null } : {}),
          observacoes: observacoes.trim() || null,
          enviarParaFila: origem === "TELEFONE" && fila,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error ?? "Não foi possível registrar a venda.")
      toast.success(`Venda #${data.numero} registrada${data.status === "AGUARDANDO" ? " e enviada para a fila" : ""}.`)
      router.push("/comerciante/gestao/vendas")
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  const chip = (on: boolean) =>
    cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground/30")

  return (
    <div className="space-y-5 pb-28">
      {/* Origem */}
      <div className="flex gap-2">
        <button type="button" className={chip(origem === "BALCAO")} onClick={() => { setOrigem("BALCAO"); setEntrega(false); setFila(false) }}>
          <Store className="mr-1.5 inline h-4 w-4" /> Balcão
        </button>
        <button type="button" className={chip(origem === "TELEFONE")} onClick={() => setOrigem("TELEFONE")}>
          <Phone className="mr-1.5 inline h-4 w-4" /> Telefone
        </button>
      </div>

      {/* Itens */}
      <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-semibold">Itens</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => { setBusca(e.target.value); setEscolhendo(null) }} placeholder="Buscar no cardápio e catálogo" className="pl-8 text-[16px]" />
        </div>
        {filtrados.length > 0 && !escolhendo && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {filtrados.map((i) => (
              <li key={i.id}>
                <button type="button" className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => (i.variacoes.length > 0 ? setEscolhendo(i) : adicionar(i))}>
                  <span><span className="font-medium">{i.titulo}</span> <span className="text-xs text-muted-foreground">· {i.grupo}</span></span>
                  <span className="tabular-nums text-muted-foreground">{i.variacoes.length > 0 ? `${i.variacoes.length} opções` : i.preco != null ? brl(centavos(i.preco)) : "sem preço"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {escolhendo && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="flex items-center justify-between text-sm font-medium">
              {escolhendo.titulo}
              <button type="button" aria-label="Fechar" onClick={() => setEscolhendo(null)}><X className="h-4 w-4" /></button>
            </p>
            <div className="flex flex-wrap gap-2">
              {escolhendo.variacoes.map((v) => (
                <Button key={v.id} size="sm" variant="outline" onClick={() => adicionar(escolhendo, v)}>
                  {v.nome} · {brl(centavos(v.preco))}
                </Button>
              ))}
            </div>
          </div>
        )}

        {linhas.length > 0 && (
          <ul className="space-y-2">
            {linhas.map((l) => (
              <li key={l.chave} className="flex items-center gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.titulo}{l.detalhe && <span className="font-normal text-muted-foreground"> · {l.detalhe}</span>}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{brl(centavos(l.precoUnit))} × {l.quantidade} = {brl(centavos(l.precoUnit) * l.quantidade)}</p>
                </div>
                <button type="button" aria-label="Diminuir" className="flex h-8 w-8 items-center justify-center rounded-md border" onClick={() => qtd(l.chave, -1)}>
                  {l.quantidade === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </button>
                <span className="w-6 text-center tabular-nums">{l.quantidade}</span>
                <button type="button" aria-label="Aumentar" className="flex h-8 w-8 items-center justify-center rounded-md border" onClick={() => qtd(l.chave, 1)}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 border-t border-border pt-3">
          <Input value={avulso.titulo} onChange={(e) => setAvulso({ ...avulso, titulo: e.target.value })} placeholder="Item avulso" className="flex-1 text-[16px]" />
          <Input value={avulso.preco} onChange={(e) => setAvulso({ ...avulso, preco: e.target.value })} placeholder="R$" inputMode="decimal" className="w-24 text-[16px]" />
          <Button type="button" variant="outline" onClick={adicionarAvulso}>Adicionar</Button>
        </div>
      </section>

      {/* Cliente */}
      <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-semibold">Cliente <span className="font-normal text-muted-foreground">(opcional)</span></h2>
        {cliente ? (
          <p className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span><span className="font-medium">{cliente.nome}</span>{cliente.whatsapp && <span className="text-muted-foreground"> · {cliente.whatsapp}</span>}</span>
            <button type="button" aria-label="Remover cliente" onClick={() => setCliente(null)}><X className="h-4 w-4" /></button>
          </p>
        ) : (
          <>
            <div className="relative">
              <Input value={clienteNome} onChange={(e) => { setClienteNome(e.target.value); if (e.target.value.trim().length < 2) setSugestoes([]) }} placeholder={buscaClientes ? "Nome (busca clientes cadastrados)" : "Nome"} className="text-[16px]" />
              {sugestoes.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full divide-y divide-border rounded-lg border border-border bg-popover shadow">
                  {sugestoes.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setCliente(s); setSugestoes([]) }}>
                        {s.nome}{s.whatsapp && <span className="text-muted-foreground"> · {s.whatsapp}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Input value={clienteWhats} onChange={(e) => setClienteWhats(e.target.value)} placeholder="WhatsApp (cadastra o cliente)" inputMode="tel" className="text-[16px]" />
          </>
        )}
      </section>

      {/* Entrega (telefone) */}
      {origem === "TELEFONE" && (
        <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="text-sm font-semibold">Entrega</h2>
          <div className="flex gap-2">
            <button type="button" className={chip(!entrega)} onClick={() => setEntrega(false)}>Retirada</button>
            <button type="button" className={chip(entrega)} onClick={() => setEntrega(true)} disabled={zonas.length === 0}>Entrega</button>
          </div>
          {zonas.length === 0 && <p className="text-xs text-muted-foreground">Cadastre bairros de entrega em Pedidos para lançar entregas.</p>}
          {entrega && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={end.endereco} onChange={(e) => setEnd({ ...end, endereco: e.target.value })} placeholder="Rua" className="text-[16px] sm:col-span-2" />
              <Input value={end.numeroEnd} onChange={(e) => setEnd({ ...end, numeroEnd: e.target.value })} placeholder="Número" className="text-[16px]" />
              <select value={end.zonaId} onChange={(e) => setEnd({ ...end, zonaId: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-[16px]">
                <option value="">Bairro</option>
                {zonas.map((z) => <option key={z.id} value={z.id}>{z.nome} · {brl(centavos(z.taxa))}</option>)}
              </select>
              <Input value={end.complemento} onChange={(e) => setEnd({ ...end, complemento: e.target.value })} placeholder="Complemento" className="text-[16px]" />
              <Input value={end.referencia} onChange={(e) => setEnd({ ...end, referencia: e.target.value })} placeholder="Referência" className="text-[16px]" />
            </div>
          )}
          {temPedidoOnline && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fila} onChange={(e) => setFila(e.target.checked)} />
              Enviar para a fila de pedidos (em vez de registrar como concluída)
            </label>
          )}
        </section>
      )}

      {/* Pagamento */}
      <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-semibold">Pagamento</h2>
        <div className="flex flex-wrap gap-2">
          {FORMAS_PAGAMENTO.map((f) => (
            <button key={f.key} type="button" onClick={() => setForma(f.key)} className={cn("rounded-full border px-3 py-1.5 text-sm", forma === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
              {f.label}
            </button>
          ))}
        </div>
        {forma === "dinheiro" && (
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <Label htmlFor="recebido" className="text-xs">Valor recebido</Label>
              <Input id="recebido" value={recebido} onChange={(e) => setRecebido(e.target.value)} placeholder="R$" inputMode="decimal" className="w-32 text-[16px]" />
            </div>
            {trocoC != null && <p className="pt-5 text-sm">Troco: <strong className="tabular-nums">{brl(trocoC)}</strong></p>}
            {recebidoC != null && recebidoC < totalC && <p className="pt-5 text-sm text-destructive">Valor menor que o total</p>}
          </div>
        )}
        <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações (opcional)" className="text-[16px]" />
      </section>

      {/* Total fixo no rodapé */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{taxaC > 0 ? `Itens ${brl(subtotalC)} + entrega ${brl(taxaC)}` : `${linhas.reduce((a, l) => a + l.quantidade, 0)} item(ns)`}</p>
            <p className="text-xl font-bold tabular-nums">{brl(totalC)}</p>
          </div>
          <Button size="lg" disabled={salvando || linhas.length === 0} onClick={registrar}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar venda
          </Button>
        </div>
      </div>
    </div>
  )
}
