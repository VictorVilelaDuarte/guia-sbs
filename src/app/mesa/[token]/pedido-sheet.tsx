"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ArrowLeft, Loader2, Minus, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react"
import type { CardapioDaMesa, ContaDaMesa } from "@/lib/gestao/mesas"
import type { AddCarrinho } from "@/lib/carrinho"
import { ProdutoBottomSheet, type ProdutoSheet } from "@/components/public/cardapio/produto-bottom-sheet"
import { DestaqueCard } from "@/components/public/cardapio/destaque-card"
import { ItemRow } from "@/components/public/cardapio/item-row"
import { cn } from "@/lib/utils"

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const DIAMOND = "✦"
const DESTAQUES_ID = "__destaques__"
// Limites da rota /api/mesa/[token]/pedido — a tela respeita para não chegar num 400.
const MAX_LINHAS = 20
const MAX_QTD = 10
const MAX_OBS = 140

interface Linha {
  chave: string
  add: AddCarrinho // precoUnit já inclui os complementos
}

// Pedido feito pelo cliente na mesa: mesma cara do cardápio público (fotos,
// destaques, abas por categoria e bottom sheet do produto), mas os itens vão
// para a conta da mesa. O atendente confirma antes de entrar na conta.
export function PedidoSheet({
  cardapio,
  token,
  loja,
  mesa,
  nomeSalvo,
  onFechar,
  onEnviado,
}: {
  cardapio: CardapioDaMesa
  token: string
  loja: { nome: string; logo: string | null }
  mesa: string
  nomeSalvo: string
  onFechar: () => void
  onEnviado: (conta: ContaDaMesa, nome: string) => void
}) {
  const categorias = cardapio.categorias
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [etapa, setEtapa] = useState<"cardapio" | "revisar">("cardapio")
  const [selecionado, setSelecionado] = useState<ProdutoSheet | null>(null)
  const [nome, setNome] = useState(nomeSalvo)
  const [whatsapp, setWhatsapp] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // `now` fixo na montagem: promoção que vence com a tela aberta o servidor corrige.
  const [now] = useState(() => Date.now())
  const destaques = categorias.flatMap((c) => c.produtos.filter((p) => p.destaque).map((p) => ({ ...p, categoriaNome: c.nome })))
  const temDestaques = destaques.length > 0

  const [activeId, setActiveId] = useState(temDestaques ? DESTAQUES_ID : (categorias[0]?.id ?? ""))
  const [busca, setBusca] = useState("")
  const [buscaAberta, setBuscaAberta] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const tabsRef = useRef<HTMLDivElement>(null)
  const rolandoManual = useRef(false)
  const buscaRef = useRef<HTMLInputElement>(null)

  const total = linhas.reduce((a, l) => a + l.add.precoUnit * l.add.quantidade, 0)
  const qtd = linhas.reduce((a, l) => a + l.add.quantidade, 0)
  const qtdPorProduto = (id: string) => linhas.filter((l) => l.add.produtoId === id).reduce((a, l) => a + l.add.quantidade, 0)

  // Aba ativa acompanha a rolagem. A raiz é o container da tela (não a janela):
  // este pedido abre por cima da página da conta.
  useEffect(() => {
    if (buscaAberta || etapa !== "cardapio") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (rolandoManual.current) return
        const visiveis = entries.filter((e) => e.isIntersecting)
        if (visiveis.length === 0) return
        const topo = visiveis.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveId(topo.target.id)
      },
      { root: scrollRef.current, rootMargin: "-48px 0px -50% 0px", threshold: 0 },
    )
    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [buscaAberta, etapa, categorias, temDestaques])

  useEffect(() => {
    if (!tabsRef.current || buscaAberta) return
    tabsRef.current
      .querySelector<HTMLElement>(`[data-catid="${activeId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [activeId, buscaAberta])

  useEffect(() => {
    if (buscaAberta) setTimeout(() => buscaRef.current?.focus(), 50)
  }, [buscaAberta])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2500)
    return () => clearTimeout(t)
  }, [aviso])

  function irPara(id: string) {
    setActiveId(id)
    const el = sectionRefs.current.get(id)
    if (!el) return
    rolandoManual.current = true
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    setTimeout(() => (rolandoManual.current = false), 900)
  }

  // Mesma escolha (variação, complementos e observação) soma na mesma linha.
  function adicionar(add: AddCarrinho) {
    const compl = (add.complementos ?? []).map((c) => `${c.opcaoId}x${c.quantidade}`).sort().join(",")
    const chave = `${add.produtoId}:${add.variacaoId ?? ""}:${compl}:${add.observacao ?? ""}`
    const existente = linhas.find((l) => l.chave === chave)
    if (!existente && linhas.length >= MAX_LINHAS) {
      setAviso(`Envie este pedido antes de escolher mais — o limite é de ${MAX_LINHAS} itens diferentes por vez.`)
      return
    }
    setLinhas((ls) =>
      existente
        ? ls.map((l) => (l.chave === chave ? { ...l, add: { ...l.add, quantidade: Math.min(MAX_QTD, l.add.quantidade + add.quantidade) } } : l))
        : [...ls, { chave, add }],
    )
    setAviso(`${add.quantidade}× ${add.titulo} no pedido`)
  }

  const mudar = (chave: string, delta: number) =>
    setLinhas((ls) =>
      ls.flatMap((l) =>
        l.chave !== chave ? [l] : l.add.quantidade + delta <= 0 ? [] : [{ ...l, add: { ...l.add, quantidade: Math.min(MAX_QTD, l.add.quantidade + delta) } }],
      ),
    )

  function abrirRevisao() {
    setEtapa("revisar")
    scrollRef.current?.scrollTo({ top: 0 })
  }

  function voltarAoCardapio() {
    setEtapa("cardapio")
    if (linhas.length === 0) setErro(null)
  }

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
          itens: linhas.map(({ add }) => ({
            produtoId: add.produtoId,
            variacaoId: add.variacaoId,
            quantidade: add.quantidade,
            observacao: add.observacao,
            complementos: (add.complementos ?? []).map((c) => ({ opcaoId: c.opcaoId, quantidade: c.quantidade })),
          })),
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) return setErro(data.error ?? "Não foi possível enviar. Chame o atendente.")
      onEnviado(data.conta, nome.trim())
    } finally {
      setEnviando(false)
    }
  }

  const termo = busca.trim().toLowerCase()
  const resultados = termo
    ? categorias.flatMap((c) =>
        c.produtos
          .filter((p) => p.titulo.toLowerCase().includes(termo) || p.descricao?.toLowerCase().includes(termo))
          .map((p) => ({ ...p, categoriaNome: c.nome })),
      )
    : []
  const tabs = [...(temDestaques ? [{ id: DESTAQUES_ID, nome: `${DIAMOND} Destaques` }] : []), ...categorias.map((c) => ({ id: c.id, nome: c.nome }))]

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-[#F5EFE4]">
      <div ref={scrollRef} className="relative h-full w-full max-w-md overflow-y-auto bg-[#F5EFE4] text-stone-900">
        {etapa === "cardapio" ? (
          <>
            {/* Cabeçalho da loja */}
            <div className="px-4 pb-5 pt-4">
              <button
                type="button"
                onClick={onFechar}
                className="mb-4 inline-flex items-center gap-1 text-xs text-stone-500 transition-colors hover:text-stone-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para a conta
              </button>
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-stone-200 shadow-sm">
                  {loja.logo ? (
                    <Image src={loja.logo} alt={loja.nome} fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-stone-500">{loja.nome[0]}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-bold leading-tight">{loja.nome}</h1>
                  <p className="mt-0.5 text-xs font-medium text-amber-800">{mesa} · pedido pelo celular</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBuscaAberta(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
                  aria-label="Buscar no cardápio"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sticky: abas ou busca */}
            <div className="sticky top-0 z-10 border-b border-stone-200 bg-[#F5EFE4]">
              {buscaAberta ? (
                <div className="flex items-center gap-2 px-4 py-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      ref={buscaRef}
                      type="text"
                      placeholder="Buscar no cardápio..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="h-9 w-full rounded-full border border-stone-200 bg-white pl-9 pr-4 text-[16px] placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    />
                    {busca && (
                      <button
                        type="button"
                        onClick={() => setBusca("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                        aria-label="Limpar busca"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBuscaAberta(false)
                      setBusca("")
                    }}
                    className="shrink-0 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div ref={tabsRef} className="scrollbar-none flex overflow-x-auto px-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      data-catid={tab.id}
                      onClick={() => irPara(tab.id)}
                      className={cn(
                        "shrink-0 whitespace-nowrap border-b-2 px-2.5 py-3 text-sm font-medium transition-colors",
                        activeId === tab.id ? "border-stone-800 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-700",
                      )}
                    >
                      {tab.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pb-28">
              {termo ? (
                <div>
                  <p className="px-4 py-3 text-xs text-stone-400">
                    {resultados.length === 0
                      ? `Nenhum resultado para "${busca}"`
                      : `${resultados.length} resultado${resultados.length !== 1 ? "s" : ""} para "${busca}"`}
                  </p>
                  <div className="divide-y divide-stone-200">
                    {resultados.map((p) => (
                      <div key={p.id}>
                        <p className="px-4 pb-0.5 pt-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">{p.categoriaNome}</p>
                        <ItemRow produto={p} now={now} noPedido={qtdPorProduto(p.id)} onClick={() => setSelecionado(p)} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {temDestaques && (
                    <section id={DESTAQUES_ID} ref={(el) => {
                        if (el) sectionRefs.current.set(DESTAQUES_ID, el)
                        else sectionRefs.current.delete(DESTAQUES_ID)
                      }} className="scroll-mt-12 pb-6 pt-6">
                      <div className="mb-4 px-4">
                        <h2 className="flex items-center gap-2 font-serif text-2xl font-bold">
                          <span className="text-xl text-amber-700">{DIAMOND}</span>
                          Em destaque
                        </h2>
                        <p className="mt-0.5 text-sm text-stone-400">seleção da casa para hoje</p>
                      </div>
                      <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-1">
                        {destaques.map((p) => (
                          <DestaqueCard key={p.id} produto={p} now={now} onClick={() => setSelecionado(p)} />
                        ))}
                      </div>
                    </section>
                  )}

                  {categorias.map((cat) => (
                    <section key={cat.id} id={cat.id} ref={(el) => {
                        if (el) sectionRefs.current.set(cat.id, el)
                        else sectionRefs.current.delete(cat.id)
                      }} className="scroll-mt-12">
                      <div className="px-4 pb-2 pt-6">
                        <h2 className="font-serif text-4xl font-bold leading-none">{cat.nome}</h2>
                        <p className="mt-1.5 text-sm text-stone-400">
                          {cat.produtos.length} {cat.produtos.length === 1 ? "item" : "itens"}
                        </p>
                      </div>
                      <div className="mt-2 divide-y divide-stone-200">
                        {cat.produtos.map((p) => (
                          <ItemRow
                            key={p.id}
                            produto={p}
                            now={now}
                            noPedido={qtdPorProduto(p.id)}
                            onClick={() => setSelecionado({ ...p, categoriaNome: cat.nome })}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </>
              )}
            </div>
          </>
        ) : (
          <Revisao
            linhas={linhas}
            nome={nome}
            setNome={setNome}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            erro={erro}
            onVoltar={voltarAoCardapio}
            onMudar={mudar}
          />
        )}
      </div>

      {/* Aviso rápido de item adicionado */}
      {aviso && etapa === "cardapio" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <p className="fade-up rounded-full bg-stone-900/90 px-4 py-2 text-center text-sm font-medium text-white shadow-lg">{aviso}</p>
        </div>
      )}

      {/* Barra fixa — mesma do carrinho do cardápio online */}
      {(etapa === "revisar" || qtd > 0) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          {etapa === "cardapio" ? (
            <button
              type="button"
              onClick={abrirRevisao}
              className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-stone-900 px-5 py-3.5 text-white shadow-lg shadow-black/25 transition-colors active:bg-black"
            >
              <span className="flex items-center gap-2.5 font-semibold">
                <span className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold tabular-nums">
                    {qtd}
                  </span>
                </span>
                Ver pedido
              </span>
              <span className="font-bold tabular-nums">{brl(total)}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={enviando || qtd === 0 || nome.trim().length < 2}
              onClick={enviar}
              className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-emerald-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-black/25 transition-colors active:bg-emerald-700 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                {enviando && <Loader2 className="h-5 w-5 animate-spin" />}
                {nome.trim().length < 2 && qtd > 0 ? "Diga o seu nome" : "Enviar pedido"}
              </span>
              <span className="font-bold tabular-nums">{brl(total)}</span>
            </button>
          )}
        </div>
      )}

      <ProdutoBottomSheet
        produto={selecionado}
        now={now}
        onClose={() => setSelecionado(null)}
        onAddToCart={adicionar}
        quantidadeMax={MAX_QTD}
        observacaoMax={MAX_OBS}
      />
    </div>
  )
}

// Conferência antes de enviar: fotos, escolhas, quantidades e quem está pedindo.
function Revisao({
  linhas,
  nome,
  setNome,
  whatsapp,
  setWhatsapp,
  erro,
  onVoltar,
  onMudar,
}: {
  linhas: Linha[]
  nome: string
  setNome: (v: string) => void
  whatsapp: string
  setWhatsapp: (v: string) => void
  erro: string | null
  onVoltar: () => void
  onMudar: (chave: string, delta: number) => void
}) {
  return (
    <div className="px-4 pb-32 pt-4">
      <button type="button" onClick={onVoltar} className="mb-4 inline-flex items-center gap-1 text-xs text-stone-500 transition-colors hover:text-stone-800">
        <ArrowLeft className="h-3.5 w-3.5" />
        Continuar escolhendo
      </button>
      <h1 className="font-serif text-3xl font-bold leading-none">Seu pedido</h1>
      <p className="mt-1.5 text-sm text-stone-500">Confira antes de enviar para o atendente.</p>

      {linhas.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm">
          <ShoppingBag className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-2 font-semibold">Nenhum item escolhido</p>
          <button type="button" onClick={onVoltar} className="mt-3 text-sm font-semibold text-amber-800">
            Voltar ao cardápio
          </button>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm">
          {linhas.map(({ chave, add }) => {
            const detalhe = [
              add.variacaoNome,
              ...(add.complementos ?? []).map((c) => (c.quantidade > 1 ? `${c.quantidade}× ${c.nome}` : c.nome)),
            ].filter(Boolean)
            return (
              <li key={chave} className="flex gap-3 p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                  {add.imagem && <Image src={add.imagem} alt={add.titulo} fill sizes="64px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{add.titulo}</p>
                  {detalhe.length > 0 && <p className="mt-0.5 text-xs text-stone-500">{detalhe.join(" · ")}</p>}
                  {add.observacao && <p className="mt-0.5 text-xs italic text-stone-500">↳ {add.observacao}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold tabular-nums">{brl(add.precoUnit * add.quantidade)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={add.quantidade === 1 ? `Tirar ${add.titulo}` : `Menos ${add.titulo}`}
                        onClick={() => onMudar(chave, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-700 active:bg-stone-100"
                      >
                        {add.quantidade === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                      </button>
                      <span className="w-5 text-center font-semibold tabular-nums">{add.quantidade}</span>
                      <button
                        type="button"
                        aria-label={`Mais ${add.titulo}`}
                        onClick={() => onMudar(chave, 1)}
                        disabled={add.quantidade >= MAX_QTD}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-700 active:bg-stone-100 disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 space-y-2 rounded-2xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium" htmlFor="nome-cliente">
          Seu nome
        </label>
        <input
          id="nome-cliente"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como o atendente vai te chamar"
          maxLength={60}
          className="h-12 w-full rounded-xl border border-stone-200 px-3 text-[16px] placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
        />
        <label className="block pt-2 text-sm font-medium" htmlFor="whats-cliente">
          WhatsApp <span className="font-normal text-stone-400">(opcional)</span>
        </label>
        <input
          id="whats-cliente"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="(12) 90000-0000"
          inputMode="tel"
          className="h-12 w-full rounded-xl border border-stone-200 px-3 text-[16px] placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
        />
        <p className="text-xs text-stone-500">Usamos o WhatsApp só para a loja te identificar nas próximas visitas.</p>
      </div>

      <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        O atendente confirma o pedido antes de ir para a cozinha e entrar na conta.
      </p>
      {erro && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{erro}</p>}
    </div>
  )
}
