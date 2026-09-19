"use client"

import { forwardRef, useMemo, useState } from "react"
import { Minus, PackagePlus, Plus, Search, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { brl, centavos, parseReais, type ComplementoPdv, type ItemCatalogoPdv } from "./tipos"

type Variacao = ItemCatalogoPdv["variacoes"][number]

// Grade de produtos do PDV: busca, categorias e botões grandes (toque e mouse).
// Enter na busca adiciona o primeiro resultado; produto com variações abre a escolha.
export const CatalogoPdv = forwardRef<HTMLInputElement, {
  itens: ItemCatalogoPdv[]
  onAdicionar: (item: ItemCatalogoPdv, variacao?: Variacao, complementos?: ComplementoPdv[]) => void
  onAvulso: (titulo: string, precoC: number) => void
}>(function CatalogoPdv({ itens, onAdicionar, onAvulso }, buscaRef) {
  const [busca, setBusca] = useState("")
  const [grupo, setGrupo] = useState<string | null>(null)
  const [escolhendo, setEscolhendo] = useState<ItemCatalogoPdv | null>(null)
  const [avulso, setAvulso] = useState<{ titulo: string; preco: string } | null>(null)

  const grupos = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of itens) if (!m.has(i.grupo)) m.set(i.grupo, i.grupoOrdem)
    return [...m.entries()].sort((a, b) => a[1] - b[1]).map(([nome]) => nome)
  }, [itens])

  const visiveis = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    const base = q
      ? itens.filter((i) => i.titulo.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(q))
      : grupo
        ? itens.filter((i) => i.grupo === grupo)
        : itens
    return [...base].sort((a, b) => a.grupoOrdem - b.grupoOrdem)
  }, [busca, grupo, itens])

  function tocar(item: ItemCatalogoPdv) {
    if (!item.disponivel) return
    // Variação e/ou complementos: abre a escolha antes de lançar.
    if (item.variacoes.length > 0 || item.complementos.length > 0) setEscolhendo(item)
    else onAdicionar(item)
  }

  function confirmarAvulso() {
    if (!avulso) return
    const preco = parseReais(avulso.preco)
    if (!avulso.titulo.trim() || !(preco > 0)) return
    onAvulso(avulso.titulo.trim(), centavos(preco))
    setAvulso(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-stone-200 bg-white p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            ref={buscaRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const primeiro = visiveis.find((i) => i.disponivel)
                if (primeiro) {
                  tocar(primeiro)
                  setBusca("")
                }
              }
              if (e.key === "Escape") setBusca("")
            }}
            placeholder="Buscar produto  ( / )"
            className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-9 text-[16px] outline-none focus:border-stone-400 focus:bg-white"
          />
          {busca && (
            <button type="button" aria-label="Limpar busca" onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {!busca && grupos.length > 1 && (
          <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 scrollbar-none">
            {[null, ...grupos].map((g) => (
              <button
                key={g ?? "todos"}
                type="button"
                onClick={() => setGrupo(g)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
                  grupo === g ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200",
                )}
              >
                {g ?? "Todos"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {visiveis.map((i) => (
            <button
              key={i.id}
              type="button"
              disabled={!i.disponivel}
              onClick={() => tocar(i)}
              className={cn(
                "flex min-h-[84px] flex-col justify-between rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 transition active:scale-[0.98]",
                i.disponivel ? "hover:ring-stone-400" : "cursor-not-allowed opacity-50",
              )}
            >
              <span className="line-clamp-2 text-sm font-semibold leading-snug">{i.titulo}</span>
              <span className="mt-1 text-xs tabular-nums text-stone-600">
                {!i.disponivel
                  ? "Indisponível"
                  : i.variacoes.length > 0
                    ? `${i.variacoes.length} opções · a partir de ${brl(centavos(Math.min(...i.variacoes.map((v) => v.preco))))}`
                    : brl(centavos(i.preco ?? 0))}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAvulso({ titulo: busca.trim(), preco: "" })}
            className="flex min-h-[84px] flex-col items-start justify-between rounded-xl border-2 border-dashed border-stone-300 p-3 text-left text-stone-600 hover:border-stone-500"
          >
            <PackagePlus className="h-5 w-5" />
            <span className="text-sm font-medium">Item avulso</span>
          </button>
        </div>
        {visiveis.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-500">Nenhum produto encontrado. Use o item avulso para vender algo fora do cardápio.</p>
        )}
      </div>

      <Dialog open={!!escolhendo} onOpenChange={(o) => !o && setEscolhendo(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{escolhendo?.titulo}</DialogTitle>
          </DialogHeader>
          {escolhendo && (
            <EscolhaItem
              item={escolhendo}
              onConfirmar={(variacao, complementos) => {
                onAdicionar(escolhendo, variacao, complementos)
                setEscolhendo(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!avulso} onOpenChange={(o) => !o && setAvulso(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Item avulso</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              confirmarAvulso()
            }}
          >
            <input
              autoFocus
              value={avulso?.titulo ?? ""}
              onChange={(e) => setAvulso((a) => a && { ...a, titulo: e.target.value })}
              placeholder="Nome (ex.: Bolo por kg)"
              maxLength={120}
              className="h-11 w-full rounded-lg border border-stone-300 px-3 text-[16px]"
            />
            <input
              value={avulso?.preco ?? ""}
              onChange={(e) => setAvulso((a) => a && { ...a, preco: e.target.value })}
              placeholder="Preço (R$)"
              inputMode="decimal"
              className="h-11 w-full rounded-lg border border-stone-300 px-3 text-[16px]"
            />
            <button
              type="submit"
              disabled={!avulso?.titulo.trim() || !(parseReais(avulso?.preco ?? "") > 0)}
              className="h-11 w-full rounded-lg bg-stone-900 font-semibold text-white disabled:opacity-40"
            >
              Adicionar
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
})


// Escolha de variação e complementos antes de lançar o item (PDV).
function EscolhaItem({ item, onConfirmar }: { item: ItemCatalogoPdv; onConfirmar: (variacao?: Variacao, complementos?: ComplementoPdv[]) => void }) {
  const [variacao, setVariacao] = useState<Variacao | null>(item.variacoes[0] ?? null)
  const [escolhas, setEscolhas] = useState<Record<string, number>>({})

  const baseC = centavos(variacao?.preco ?? item.preco ?? 0)
  const selecionados: ComplementoPdv[] = item.complementos.flatMap((g) =>
    g.opcoes
      .filter((o) => (escolhas[o.id] ?? 0) > 0)
      .map((o) => ({ opcaoId: o.id, grupoNome: g.nome, nome: o.nome, precoC: centavos(o.preco), quantidade: escolhas[o.id] })),
  )
  const extraC = selecionados.reduce((a, c) => a + c.precoC * c.quantidade, 0)
  const porGrupo = (g: ItemCatalogoPdv["complementos"][number]) => g.opcoes.reduce((a, o) => a + (escolhas[o.id] ?? 0), 0)
  const faltando = item.complementos.filter((g) => porGrupo(g) < g.minimo)

  function mudar(opcaoId: string, delta: number, grupo: ItemCatalogoPdv["complementos"][number], max: number) {
    setEscolhas((e) => {
      const atual = e[opcaoId] ?? 0
      const novo = Math.min(Math.max(atual + delta, 0), max)
      const outros = grupo.opcoes.reduce((a, o) => a + (o.id === opcaoId ? 0 : e[o.id] ?? 0), 0)
      if (outros + novo > grupo.maximo) return e
      return { ...e, [opcaoId]: novo }
    })
  }

  return (
    <div className="space-y-4">
      {item.variacoes.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {item.variacoes.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariacao(v)}
              className={cn(
                "rounded-xl p-3 text-left ring-1",
                variacao?.id === v.id ? "bg-stone-900 text-white ring-stone-900" : "bg-stone-50 ring-stone-200 hover:ring-stone-500",
              )}
            >
              <span className="block text-sm font-semibold">{v.nome}</span>
              <span className="text-sm tabular-nums opacity-80">{brl(centavos(v.preco))}</span>
            </button>
          ))}
        </div>
      )}

      {item.complementos.map((g) => (
        <div key={g.id} className="space-y-1.5">
          <p className="flex items-baseline justify-between text-sm font-semibold">
            {g.nome}
            <span className="text-xs font-normal text-stone-500">
              {g.minimo > 0 ? `escolha ${g.minimo === g.maximo ? g.minimo : `${g.minimo} a ${g.maximo}`}` : `até ${g.maximo}`}
            </span>
          </p>
          <ul className="divide-y divide-stone-100 rounded-xl ring-1 ring-stone-200">
            {g.opcoes.map((o) => {
              const qtd = escolhas[o.id] ?? 0
              return (
                <li key={o.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    {o.nome}
                    <span className="ml-1.5 text-xs tabular-nums text-stone-500">{o.preco > 0 ? `+ ${brl(centavos(o.preco))}` : "grátis"}</span>
                  </span>
                  {o.quantidadeMax > 1 || qtd > 0 ? (
                    <span className="flex items-center gap-1">
                      <button type="button" aria-label={`Menos ${o.nome}`} onClick={() => mudar(o.id, -1, g, o.quantidadeMax)} className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-stone-300">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center font-semibold tabular-nums">{qtd}</span>
                      <button type="button" aria-label={`Mais ${o.nome}`} onClick={() => mudar(o.id, 1, g, o.quantidadeMax)} className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-stone-300">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => mudar(o.id, 1, g, o.quantidadeMax)} className="h-8 rounded-lg px-3 text-sm font-medium ring-1 ring-stone-300 hover:ring-stone-500">
                      Escolher
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <button
        type="button"
        disabled={faltando.length > 0}
        onClick={() => onConfirmar(variacao ?? undefined, selecionados)}
        className="flex h-12 w-full items-center justify-between rounded-xl bg-stone-900 px-4 font-semibold text-white disabled:opacity-40"
      >
        <span>{faltando.length > 0 ? `Escolha em "${faltando[0].nome}"` : "Adicionar"}</span>
        <span className="tabular-nums">{brl(baseC + extraC)}</span>
      </button>
    </div>
  )
}
