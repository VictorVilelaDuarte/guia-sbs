"use client"

import { useState } from "react"
import { ArrowLeft, Loader2, Minus, Plus, X } from "lucide-react"
import type { CardapioDaMesa, ContaDaMesa } from "@/lib/gestao/mesas"
import { cn } from "@/lib/utils"

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

interface Linha {
  chave: string
  produtoId: string
  variacaoId: string | null
  titulo: string
  detalhe: string | null
  preco: number
  quantidade: number
}

type Item = CardapioDaMesa["categorias"][number]["itens"][number]

// Pedido feito pelo cliente na mesa: escolhe no cardápio, confere e envia.
// O atendente confirma antes de entrar na conta — a tela deixa isso claro.
export function PedidoSheet({
  cardapio,
  token,
  nomeSalvo,
  onFechar,
  onEnviado,
}: {
  cardapio: CardapioDaMesa
  token: string
  nomeSalvo: string
  onFechar: () => void
  onEnviado: (conta: ContaDaMesa, nome: string) => void
}) {
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [escolhendo, setEscolhendo] = useState<Item | null>(null)
  const [etapa, setEtapa] = useState<"cardapio" | "revisar">("cardapio")
  const [nome, setNome] = useState(nomeSalvo)
  const [whatsapp, setWhatsapp] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const total = linhas.reduce((a, l) => a + l.preco * l.quantidade, 0)
  const qtd = linhas.reduce((a, l) => a + l.quantidade, 0)

  function adicionar(item: Item, variacao?: { id: string; nome: string; preco: number }) {
    const chave = `${item.id}:${variacao?.id ?? ""}`
    setLinhas((ls) => {
      const igual = ls.find((l) => l.chave === chave)
      if (igual) return ls.map((l) => (l.chave === chave ? { ...l, quantidade: Math.min(10, l.quantidade + 1) } : l))
      return [...ls, { chave, produtoId: item.id, variacaoId: variacao?.id ?? null, titulo: item.titulo, detalhe: variacao?.nome ?? null, preco: variacao?.preco ?? item.preco ?? 0, quantidade: 1 }]
    })
    setEscolhendo(null)
  }

  const mudar = (chave: string, delta: number) =>
    setLinhas((ls) => ls.flatMap((l) => (l.chave !== chave ? [l] : l.quantidade + delta <= 0 ? [] : [{ ...l, quantidade: Math.min(10, l.quantidade + delta) }])))

  async function enviar() {
    if (enviando) return
    setEnviando(true)
    setErro(null)
    try {
      const r = await fetch(`/api/mesa/${token}/pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.trim() || null,
          itens: linhas.map((l) => ({ produtoId: l.produtoId, variacaoId: l.variacaoId, quantidade: l.quantidade })),
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) return setErro(data.error ?? "Não foi possível enviar. Chame o atendente.")
      onEnviado(data.conta, nome.trim())
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50">
      <header className="flex items-center gap-2 border-b border-stone-200 bg-white px-3 py-3">
        <button
          type="button"
          aria-label={etapa === "revisar" ? "Voltar ao cardápio" : "Fechar"}
          onClick={() => (etapa === "revisar" ? setEtapa("cardapio") : onFechar())}
          className="rounded-lg p-2 hover:bg-stone-100"
        >
          {etapa === "revisar" ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
        <h2 className="font-semibold">{etapa === "revisar" ? "Confira seu pedido" : "Fazer pedido"}</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {etapa === "cardapio" ? (
          <div className="space-y-5">
            {cardapio.categorias.map((cat) => (
              <section key={cat.nome}>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">{cat.nome}</h3>
                <ul className="space-y-2">
                  {cat.itens.map((i) => {
                    const naLista = linhas.filter((l) => l.produtoId === i.id).reduce((a, l) => a + l.quantidade, 0)
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => (i.variacoes.length > 0 ? setEscolhendo(i) : adicionar(i))}
                          className="flex w-full items-start justify-between gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200"
                        >
                          <span className="min-w-0">
                            <span className="block font-medium">
                              {i.titulo}
                              {naLista > 0 && <span className="ml-2 rounded-full bg-stone-900 px-1.5 py-0.5 text-[11px] font-bold text-white">{naLista}</span>}
                            </span>
                            {i.descricao && <span className="mt-0.5 line-clamp-2 block text-xs text-stone-500">{i.descricao}</span>}
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {i.variacoes.length > 0 ? `a partir de ${brl(Math.min(...i.variacoes.map((v) => v.preco)))}` : brl(i.preco ?? 0)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-stone-100 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-stone-200">
              {linhas.map((l) => (
                <li key={l.chave} className="flex items-center gap-2 p-2.5">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-medium">
                      {l.titulo}
                      {l.detalhe && <span className="text-stone-500"> · {l.detalhe}</span>}
                    </span>
                    <span className="text-xs tabular-nums text-stone-500">{brl(l.preco)} cada</span>
                  </span>
                  <button type="button" aria-label={`Menos ${l.titulo}`} onClick={() => mudar(l.chave, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-stone-300">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-5 text-center font-semibold tabular-nums">{l.quantidade}</span>
                  <button type="button" aria-label={`Mais ${l.titulo}`} onClick={() => mudar(l.chave, 1)} className="flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-stone-300">
                    <Plus className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
              <label className="block text-sm font-medium" htmlFor="nome-cliente">Seu nome</label>
              <input
                id="nome-cliente"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como o atendente vai te chamar"
                maxLength={60}
                className="h-12 w-full rounded-xl border border-stone-300 px-3 text-[16px]"
              />
              <label className="block pt-2 text-sm font-medium" htmlFor="whats-cliente">
                WhatsApp <span className="font-normal text-stone-500">(opcional)</span>
              </label>
              <input
                id="whats-cliente"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(12) 90000-0000"
                inputMode="tel"
                className="h-12 w-full rounded-xl border border-stone-300 px-3 text-[16px]"
              />
              <p className="text-xs text-stone-500">Usamos o WhatsApp só para a loja te identificar nas próximas visitas.</p>
            </div>

            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              O atendente confirma o pedido antes de ir para a cozinha e entrar na conta.
            </p>
            {erro && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{erro}</p>}
          </div>
        )}
      </div>

      <footer className="border-t border-stone-200 bg-white p-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
        {etapa === "cardapio" ? (
          <button
            type="button"
            disabled={qtd === 0}
            onClick={() => setEtapa("revisar")}
            className="flex h-14 w-full items-center justify-between rounded-xl bg-stone-900 px-4 font-semibold text-white disabled:opacity-40"
          >
            <span>Revisar pedido{qtd > 0 ? ` · ${qtd} item(ns)` : ""}</span>
            <span className="tabular-nums">{brl(total)}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={enviando || qtd === 0 || nome.trim().length < 2}
            onClick={enviar}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-40"
          >
            {enviando && <Loader2 className="h-5 w-5 animate-spin" />}
            Enviar pedido · {brl(total)}
          </button>
        )}
      </footer>

      {escolhendo && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setEscolhendo(null)}>
          <div className="w-full rounded-t-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 font-semibold">{escolhendo.titulo}</p>
            <div className="grid gap-2">
              {escolhendo.variacoes.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => adicionar(escolhendo, v)}
                  className={cn("flex items-center justify-between rounded-xl bg-stone-50 p-3 text-left ring-1 ring-stone-200")}
                >
                  <span className="font-medium">{v.nome}</span>
                  <span className="tabular-nums">{brl(v.preco)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
