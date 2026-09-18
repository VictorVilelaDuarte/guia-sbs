"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Ban,
  BellRing,
  CheckCircle2,
  ChefHat,
  Combine,
  Expand,
  MoveRight,
  Printer,
  Receipt,
  Send,
  Settings,
  ShieldCheck,
  Store,
  Phone,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ComandaDetalhe, ComandaResumo } from "@/lib/gestao/comandas"
import type { ChamadoPainel } from "@/lib/gestao/mesas"
import { rotuloMesa } from "@/lib/gestao/mesas-link"
import { beep } from "@/components/comerciante/pedidos/beep"
import type { PlanoDivisao } from "@/lib/gestao/divisao"
import { calcularTotais, valorLinhaC, MAX_PERCENTUAL_SERVICO } from "@/lib/gestao/totais"
import { cn } from "@/lib/utils"
import { CatalogoPdv } from "./catalogo"
import { AbrirComandaDialog, ComandasGrid } from "./comandas-grid"
import { Conta, type LinhaConta } from "./conta"
import { ClienteVendaDialog, DADOS_VENDA_VAZIOS, DescontoDialog, type DadosVenda } from "./dados-dialogs"
import { LinhaDialog, type EdicaoLinha } from "./linha-dialog"
import { PagamentoDialog } from "./pagamento-dialog"
import {
  brl,
  centavos,
  descontoParaConta,
  enviarJson,
  parseReais,
  type DescontoInput,
  type ItemCatalogoPdv,
  type LinhaPdv,
  type PagamentoLocal,
  type ZonaPdv,
} from "./tipos"

type Dlg = null | "pagamento" | "desconto" | "cliente" | "abrir" | "editarComanda" | "juntar" | "cancelar" | "config" | "opcoes"

interface Props {
  lojaId: string
  lojaNome: string
  operador: string
  isAdmin: boolean
  itens: ItemCatalogoPdv[]
  zonas: ZonaPdv[]
  servicoPct: number | null
  comandasIniciais: ComandaResumo[]
  mesas: { nome: string; area: string | null }[]
  chamadosIniciais: ChamadoPainel[]
  temPedidoOnline: boolean
  buscaClientes: boolean
  podeDesconto: boolean
  podeCancelar: boolean
  podeConfigurar: boolean
}

const POLL_MS = 10000

function juntarLinha(ls: LinhaPdv[], nova: LinhaPdv): LinhaPdv[] {
  const igual = ls.find((l) => l.chave === nova.chave && !l.observacao && l.descontoC === 0)
  if (igual) return ls.map((l) => (l === igual ? { ...l, quantidade: Math.min(999, l.quantidade + nova.quantidade) } : l))
  return [...ls, nova]
}

function itemParaApi(l: LinhaPdv) {
  const base = { quantidade: l.quantidade, observacao: l.observacao, desconto: l.descontoC > 0 ? l.descontoC / 100 : null }
  return l.produtoId
    ? { ...base, produtoId: l.produtoId, variacaoId: l.variacaoId }
    : { ...base, titulo: l.titulo, precoUnit: l.precoC / 100 }
}

function lerRascunho(chave: string) {
  try {
    const salvo = localStorage.getItem(chave)
    return salvo ? JSON.parse(salvo) : null
  } catch {
    return null // rascunho inválido ou sem armazenamento: começa do zero
  }
}

function abrirCupom(id: string, conferencia = false) {
  window.open(`/comerciante/pdv/cupom/${id}?imprimir=1${conferencia ? "&tipo=conferencia" : ""}`, "cupom", "width=420,height=720")
}

// PDV em tela cheia: venda rápida (balcão/telefone) e comandas (mesa/nome), com
// catálogo em grade, conta ao lado, pagamento em várias formas e divisão da conta.
// No celular, alterna entre produtos e conta pela barra inferior.
export function PdvApp(props: Props) {
  const { podeDesconto, podeCancelar } = props
  const buscaRef = useRef<HTMLInputElement>(null)
  const [aba, setAba] = useState<"venda" | "comandas">("venda")
  const [telaMobile, setTelaMobile] = useState<"produtos" | "conta">("produtos")
  const [servicoPct, setServicoPct] = useState(props.servicoPct)
  const [dlg, setDlg] = useState<Dlg>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<{ id: string; numero: number; trocoC: number; comanda: boolean } | null>(null)

  // ---- venda rápida (rascunho guardado no navegador: recarregar não perde a venda)
  const chaveRascunho = `pdv:venda:${props.lojaId}`
  // O PDV é renderizado só no navegador (pdv-cliente.tsx), então o rascunho é
  // lido direto no estado inicial.
  const [rascunho] = useState(() => lerRascunho(chaveRascunho))
  const [linhas, setLinhas] = useState<LinhaPdv[]>(() => (Array.isArray(rascunho?.linhas) ? rascunho.linhas : []))
  const [desconto, setDesconto] = useState<DescontoInput | null>(() => rascunho?.desconto ?? null)
  const [cobrarServico, setCobrarServico] = useState(() => rascunho?.cobrarServico === true)
  const [dados, setDados] = useState<DadosVenda>(() => ({ ...DADOS_VENDA_VAZIOS, ...(rascunho?.dados ?? {}) }))
  const [planoVenda, setPlanoVenda] = useState<PlanoDivisao | null>(null)

  useEffect(() => {
    try {
      if (linhas.length === 0 && !desconto) localStorage.removeItem(chaveRascunho)
      else localStorage.setItem(chaveRascunho, JSON.stringify({ linhas, desconto, dados, cobrarServico }))
    } catch {
      // sem armazenamento local: segue sem rascunho
    }
  }, [chaveRascunho, linhas, desconto, dados, cobrarServico])

  function limparVenda() {
    setLinhas([])
    setDesconto(null)
    setCobrarServico(false)
    setDados(DADOS_VENDA_VAZIOS)
    setPlanoVenda(null)
  }

  // ---- comandas
  const [comandas, setComandas] = useState<ComandaResumo[]>(props.comandasIniciais)
  const [comanda, setComanda] = useState<ComandaDetalhe | null>(null)
  const [pendentes, setPendentes] = useState<LinhaPdv[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [chamados, setChamados] = useState<ChamadoPainel[]>(props.chamadosIniciais)
  const chamadosVistos = useRef(new Set(props.chamadosIniciais.map((c) => c.id)))

  const atualizarLista = useCallback(async () => {
    const r = await fetch("/api/comerciante/gestao/comandas", { cache: "no-store" }).catch(() => null)
    if (r?.ok) setComandas(await r.json())
  }, [])

  const carregarComanda = useCallback(async (id: string) => {
    const r = await fetch(`/api/comerciante/gestao/comandas/${id}`, { cache: "no-store" }).catch(() => null)
    if (!r?.ok) return null
    const c: ComandaDetalhe = await r.json()
    return c
  }, [])

  // Chamados das mesas (QR): valem para quem está no PDV mesmo fora da aba de
  // comandas — por isso o polling é separado, com bipe quando chega um novo.
  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch("/api/comerciante/gestao/chamados", { cache: "no-store" }).catch(() => null)
      if (!r?.ok) return
      const lista: ChamadoPainel[] = await r.json()
      if (lista.some((c) => !chamadosVistos.current.has(c.id))) beep()
      chamadosVistos.current = new Set(lista.map((c) => c.id))
      setChamados(lista)
    }, POLL_MS)
    return () => clearInterval(t)
  }, [])

  async function atenderChamado(id: string) {
    const r = await enviarJson<ChamadoPainel[]>("/api/comerciante/gestao/chamados", { id })
    if (!r.ok) return toast.error(r.erro)
    setChamados(r.data)
  }

  // Polling: vários aparelhos (caixa e garçons) lançam na mesma comanda.
  useEffect(() => {
    if (aba !== "comandas") return
    const t = setInterval(async () => {
      await atualizarLista()
      if (comanda) {
        const c = await carregarComanda(comanda.id)
        if (!c || c.status !== "ABERTA") {
          toast.info(`A comanda #${comanda.numero} foi ${c?.status === "CONCLUIDO" ? "fechada" : "encerrada"} em outro aparelho.`)
          setComanda(null)
          setPendentes([])
        } else {
          setComanda(c)
        }
      }
    }, POLL_MS)
    return () => clearInterval(t)
  }, [aba, comanda, atualizarLista, carregarComanda])

  async function abrirComandaExistente(id: string) {
    const c = await carregarComanda(id)
    if (!c) return toast.error("Não foi possível abrir a comanda.")
    if (c.status !== "ABERTA") {
      toast.info("Esta comanda já foi encerrada.")
      return atualizarLista()
    }
    setComanda(c)
    setPendentes([])
    setTelaMobile("produtos")
  }

  async function acaoComanda(body: Record<string, unknown>, ok?: string): Promise<boolean> {
    if (!comanda) return false
    const r = await enviarJson<ComandaDetalhe>(`/api/comerciante/gestao/comandas/${comanda.id}`, body)
    if (!r.ok) {
      toast.error(r.erro)
      if (r.status === 409 || r.status === 404) {
        const c = await carregarComanda(comanda.id)
        setComanda(c && c.status === "ABERTA" ? c : null)
      }
      return false
    }
    if (ok) toast.success(ok)
    if (r.data.status === "CONCLUIDO") {
      const trocoC = r.data.pagamentos
        .filter((p) => !p.estornadoEm && p.recebido != null)
        .reduce((a, p) => a + centavos(p.recebido!) - centavos(p.valor), 0)
      setSucesso({ id: r.data.id, numero: r.data.numero, trocoC, comanda: true })
      setComanda(null)
      setPendentes([])
      setDlg(null)
    } else if (r.data.status !== "ABERTA") {
      setComanda(null)
      setPendentes([])
    } else {
      setComanda(r.data)
    }
    atualizarLista()
    return true
  }

  // ---- adicionar do catálogo
  function adicionar(item: ItemCatalogoPdv, variacao?: ItemCatalogoPdv["variacoes"][number]) {
    const nova: LinhaPdv = {
      chave: `${item.id}:${variacao?.id ?? ""}`,
      produtoId: item.id,
      variacaoId: variacao?.id ?? null,
      titulo: item.titulo,
      detalhe: variacao?.nome ?? null,
      precoC: centavos(variacao?.preco ?? item.preco ?? 0),
      quantidade: 1,
      observacao: null,
      descontoC: 0,
    }
    if (aba === "comandas") {
      if (!comanda) return toast.info("Abra ou escolha uma comanda primeiro.")
      setPendentes((ls) => juntarLinha(ls, nova))
    } else {
      setLinhas((ls) => juntarLinha(ls, nova))
    }
  }

  function avulso(titulo: string, precoC: number) {
    const nova: LinhaPdv = { chave: `avulso:${Date.now()}`, produtoId: null, variacaoId: null, titulo, detalhe: "avulso", precoC, quantidade: 1, observacao: null, descontoC: 0 }
    if (aba === "comandas") {
      if (!comanda) return toast.info("Abra ou escolha uma comanda primeiro.")
      setPendentes((ls) => [...ls, nova])
    } else setLinhas((ls) => [...ls, nova])
  }

  const mudarQtd = (set: typeof setLinhas) => (chave: string, delta: number) =>
    set((ls) => ls.flatMap((l) => (l.chave !== chave ? [l] : l.quantidade + delta <= 0 ? [] : [{ ...l, quantidade: Math.min(999, l.quantidade + delta), descontoC: Math.min(l.descontoC, l.precoC * (l.quantidade + delta)) }])))

  // ---- totais
  const zona = dados.origem === "TELEFONE" && dados.entrega ? props.zonas.find((z) => z.id === dados.zonaId) : undefined
  const totaisVenda = calcularTotais({
    linhas,
    desconto: descontoParaConta(desconto),
    servicoPercentual: cobrarServico ? servicoPct : null,
    entregaC: zona ? centavos(zona.taxa) : 0,
  })
  const pendentesC = pendentes.reduce((a, l) => a + valorLinhaC(l), 0)

  const linhasComanda: LinhaConta[] = useMemo(() => {
    if (!comanda) return []
    const salvas: LinhaConta[] = comanda.itens.map((i) => ({
      chave: i.id,
      titulo: i.titulo,
      detalhe: i.variacaoNome,
      precoC: centavos(i.precoUnit),
      quantidade: i.quantidade,
      observacao: i.observacao,
      descontoC: centavos(i.desconto),
      estado: i.prontoEm ? "pronto" : i.enviadoEm ? "producao" : "lancado",
    }))
    return [...salvas, ...pendentes.map((l) => ({ ...l, estado: "novo" as const }))]
  }, [comanda, pendentes])

  // ---- venda: finalizar
  async function finalizarVenda(pagamentos: PagamentoLocal[]): Promise<boolean> {
    const comEntrega = dados.origem === "TELEFONE" && dados.entrega
    const r = await enviarJson<{ id: string; numero: number; status: string }>("/api/comerciante/gestao/vendas", {
      origem: dados.origem,
      itens: linhas.map(itemParaApi),
      clienteId: dados.cliente?.id ?? null,
      clienteNome: dados.cliente ? null : dados.clienteNome.trim() || null,
      clienteWhats: dados.cliente ? null : dados.clienteWhats.trim() || null,
      pagamentos: pagamentos.map((p) => ({ forma: p.forma, valor: p.valorC / 100, recebido: p.recebidoC != null ? p.recebidoC / 100 : null, pagante: p.pagante })),
      desconto,
      cobrarServico,
      tipoEntrega: comEntrega ? "ENTREGA" : "RETIRADA",
      ...(comEntrega
        ? { endereco: dados.endereco, numeroEnd: dados.numeroEnd, complemento: dados.complemento, referencia: dados.referencia, zonaId: dados.zonaId || null }
        : {}),
      observacoes: dados.observacoes.trim() || null,
      enviarParaFila: dados.origem === "TELEFONE" && dados.fila,
    })
    if (!r.ok) {
      toast.error(r.erro)
      return false
    }
    const trocoC = pagamentos.reduce((a, p) => a + (p.recebidoC != null ? p.recebidoC - p.valorC : 0), 0)
    if (r.data.status === "AGUARDANDO") toast.success(`Venda #${r.data.numero} enviada para a fila de pedidos.`)
    setSucesso({ id: r.data.id, numero: r.data.numero, trocoC, comanda: false })
    setDlg(null)
    limparVenda()
    return true
  }

  function abrirPagamento() {
    if (aba === "venda") {
      if (linhas.length === 0) return toast.info("Adicione itens à venda.")
      setDlg("pagamento")
    } else if (comanda) {
      if (pendentes.length > 0) return toast.info("Lance os itens novos antes de receber.")
      if (comanda.itens.length === 0) return toast.info("A comanda está sem itens.")
      setDlg("pagamento")
    }
  }

  // ---- atalhos de teclado (fora dos diálogos)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (dlg || editando || sucesso) return
      const alvo = e.target as HTMLElement
      const digitando = ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)
      if (e.key === "/" && !digitando) {
        e.preventDefault()
        buscaRef.current?.focus()
      } else if (e.key === "F2") {
        e.preventDefault()
        abrirPagamento()
      } else if (e.key === "F4" && podeDesconto && (aba === "venda" || comanda)) {
        e.preventDefault()
        setDlg("desconto")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  function telaCheia() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  function fecharPdv() {
    // Só fecha abas abertas por script; aberta por link, volta ao painel.
    window.close()
    setTimeout(() => (window.location.href = "/comerciante/gestao"), 150)
  }

  // ---- linha em edição
  const linhaEditando = (() => {
    if (!editando) return null
    if (aba === "venda") {
      const l = linhas.find((x) => x.chave === editando)
      return l ? { tipo: "local" as const, linha: l } : null
    }
    const p = pendentes.find((x) => x.chave === editando)
    if (p) return { tipo: "pendente" as const, linha: p }
    const i = comanda?.itens.find((x) => x.id === editando)
    return i
      ? {
          tipo: "comanda" as const,
          linha: { titulo: i.titulo, detalhe: i.variacaoNome, precoC: centavos(i.precoUnit), quantidade: i.quantidade, observacao: i.observacao, descontoC: centavos(i.desconto), enviado: !!i.enviadoEm },
        }
      : null
  })()

  async function salvarLinha(e: EdicaoLinha) {
    if (!linhaEditando || !editando) return
    if (linhaEditando.tipo === "comanda") {
      const ok = await acaoComanda({ acao: "alterarItem", itemId: editando, quantidade: e.quantidade, observacao: e.observacao, desconto: e.descontoC / 100, motivo: e.motivo })
      if (ok) setEditando(null)
      return
    }
    const set = linhaEditando.tipo === "local" ? setLinhas : setPendentes
    set((ls) => ls.map((l) => (l.chave === editando ? { ...l, quantidade: e.quantidade, observacao: e.observacao, descontoC: e.descontoC, chave: e.observacao || e.descontoC ? `${l.chave.split("#")[0]}#${Date.now()}` : l.chave } : l)))
    setEditando(null)
  }

  async function removerLinha(motivo: string | null) {
    if (!linhaEditando || !editando) return
    if (linhaEditando.tipo === "comanda") {
      const ok = await acaoComanda({ acao: "removerItem", itemId: editando, motivo })
      if (ok) setEditando(null)
      return
    }
    const set = linhaEditando.tipo === "local" ? setLinhas : setPendentes
    set((ls) => ls.filter((l) => l.chave !== editando))
    setEditando(null)
  }

  // Salva o plano de divisão da comanda sem travar a tela (último vence).
  const planoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  function salvarPlanoComanda(p: PlanoDivisao | null) {
    if (!comanda) return
    const id = comanda.id
    clearTimeout(planoTimer.current)
    planoTimer.current = setTimeout(() => {
      enviarJson(`/api/comerciante/gestao/comandas/${id}`, { acao: "atualizar", divisao: p })
    }, 700)
  }

  // ---- cabeçalho de cada modo
  const mostrandoGrid = aba === "comandas" && !comanda
  const qtdConta = aba === "venda" ? linhas.reduce((a, l) => a + l.quantidade, 0) : linhasComanda.reduce((a, l) => a + l.quantidade, 0)
  const totalMobileC = aba === "venda" ? totaisVenda.totalC : comanda ? centavos(comanda.saldo) + pendentesC : 0

  const botao = "flex h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold disabled:opacity-40"

  const contaVenda = (
    <Conta
      cabecalho={
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setDlg("cliente")} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-stone-100">
            {dados.origem === "TELEFONE" ? <Phone className="h-4 w-4 shrink-0" /> : <Store className="h-4 w-4 shrink-0" />}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{dados.cliente?.nome || dados.clienteNome || "Cliente balcão"}</span>
              <span className="block truncate text-xs text-stone-500">
                {dados.origem === "TELEFONE" ? `Telefone · ${dados.entrega ? "entrega" : "retirada"}${dados.fila ? " · fila" : ""}` : "Balcão"} · alterar
              </span>
            </span>
          </button>
          <span className="text-xs text-stone-500">Venda rápida</span>
        </div>
      }
      linhas={linhas}
      vazio="Toque nos produtos para montar a venda."
      onLinha={setEditando}
      onQtd={mudarQtd(setLinhas)}
      subtotalC={totaisVenda.subtotalC}
      descontoC={totaisVenda.descontoC}
      servicoC={totaisVenda.servicoC}
      servicoPct={servicoPct}
      servicoAtivo={cobrarServico}
      onServico={() => setCobrarServico((x) => !x)}
      entregaC={totaisVenda.entregaC}
      totalC={totaisVenda.totalC}
      onDesconto={podeDesconto ? () => setDlg("desconto") : undefined}
      rodape={
        <div className="flex gap-2">
          <button type="button" disabled={linhas.length === 0} onClick={() => limparVenda()} className={cn(botao, "ring-1 ring-stone-300")}>
            Limpar
          </button>
          <button type="button" disabled={linhas.length === 0} onClick={abrirPagamento} className={cn(botao, "flex-1 bg-emerald-600 text-base text-white")}>
            Receber {brl(totaisVenda.totalC)} <span className="hidden text-xs font-normal opacity-80 lg:inline">F2</span>
          </button>
        </div>
      }
    />
  )

  const contaComanda = comanda && (
    <Conta
      cabecalho={
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => { setComanda(null); setPendentes([]) }} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-100" aria-label="Voltar às comandas">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{comanda.mesa ? rotuloMesa(comanda.mesa) : comanda.clienteNome}</p>
            <p className="truncate text-xs text-stone-500">
              #{comanda.numero}
              {comanda.mesa && comanda.clienteNome !== `Mesa ${comanda.mesa}` ? ` · ${comanda.clienteNome}` : ""}
              {comanda.criadoPorNome ? ` · aberta por ${comanda.criadoPorNome}` : ""}
            </p>
          </div>
          <button type="button" onClick={() => setDlg("opcoes")} className="rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-stone-300 hover:bg-stone-50">
            Opções
          </button>
        </div>
      }
      linhas={linhasComanda}
      vazio="Toque nos produtos para lançar na comanda."
      onLinha={setEditando}
      onQtd={mudarQtd(setPendentes)}
      subtotalC={centavos(comanda.subtotal)}
      descontoC={centavos(comanda.desconto)}
      servicoC={centavos(comanda.taxaServico)}
      servicoPct={comanda.servicoPercentual ?? servicoPct}
      servicoAtivo={comanda.servicoPercentual != null}
      onServico={servicoPct != null ? () => acaoComanda({ acao: "atualizar", cobrarServico: comanda.servicoPercentual == null }) : undefined}
      totalC={centavos(comanda.total)}
      pagoC={centavos(comanda.pago)}
      extraC={pendentesC}
      onDesconto={podeDesconto ? () => setDlg("desconto") : undefined}
      rodape={
        pendentes.length > 0 ? (
          <div className="flex gap-2">
            <button type="button" disabled={ocupado} onClick={async () => {
              setOcupado(true)
              try {
                if (await acaoComanda({ acao: "lancar", itens: pendentes.map(itemParaApi), enviar: false }, "Itens lançados.")) setPendentes([])
              } finally { setOcupado(false) }
            }} className={cn(botao, "ring-1 ring-stone-300")}>
              Lançar
            </button>
            <button type="button" disabled={ocupado} onClick={async () => {
              setOcupado(true)
              try {
                if (await acaoComanda({ acao: "lancar", itens: pendentes.map(itemParaApi), enviar: true }, "Itens enviados para a produção.")) setPendentes([])
              } finally { setOcupado(false) }
            }} className={cn(botao, "flex-1 bg-stone-900 text-white")}>
              <Send className="h-4 w-4" /> Lançar e enviar p/ produção
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {comanda.itens.some((i) => !i.enviadoEm) && (
              <button type="button" disabled={ocupado} onClick={async () => {
                setOcupado(true)
                try { await acaoComanda({ acao: "enviar" }, "Enviado para a produção.") } finally { setOcupado(false) }
              }} className={cn(botao, "ring-1 ring-stone-300")}>
                <ChefHat className="h-4 w-4" /> Enviar
              </button>
            )}
            <button type="button" disabled={comanda.itens.length === 0} onClick={abrirPagamento} className={cn(botao, "flex-1 bg-emerald-600 text-base text-white")}>
              Receber {brl(centavos(comanda.saldo))} <span className="hidden text-xs font-normal opacity-80 lg:inline">F2</span>
            </button>
          </div>
        )
      }
    />
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Barra superior */}
      <header className="flex items-center gap-2 bg-stone-900 px-3 py-2 text-white">
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-bold leading-tight">{props.lojaNome}</p>
          <p className="truncate text-[11px] text-stone-400">PDV · {props.operador}</p>
        </div>
        <nav className="mx-auto flex rounded-xl bg-stone-800 p-1">
          <button type="button" onClick={() => setAba("venda")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold", aba === "venda" ? "bg-white text-stone-900" : "text-stone-300")}>
            <Receipt className="h-4 w-4" /> Venda
          </button>
          <button type="button" onClick={() => { setAba("comandas"); atualizarLista() }} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold", aba === "comandas" ? "bg-white text-stone-900" : "text-stone-300")}>
            <Users className="h-4 w-4" /> Comandas
            {comandas.length > 0 && <span className={cn("rounded-full px-1.5 text-xs", aba === "comandas" ? "bg-stone-900 text-white" : "bg-stone-600 text-white")}>{comandas.length}</span>}
          </button>
        </nav>
        <div className="flex items-center gap-1">
          {chamados.length > 0 && (
            <button
              type="button"
              onClick={() => { setAba("comandas"); setComanda(null) }}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-xs font-bold text-stone-900"
            >
              <BellRing className="h-4 w-4" /> {chamados.length}
            </button>
          )}
          {props.isAdmin && <ShieldCheck className="h-4 w-4 text-amber-400" aria-label="Modo administrador" />}
          {props.podeConfigurar && (
            <button type="button" aria-label="Configurar PDV" onClick={() => setDlg("config")} className="rounded-lg p-2 text-stone-300 hover:bg-stone-800 hover:text-white">
              <Settings className="h-4 w-4" />
            </button>
          )}
          <button type="button" aria-label="Tela cheia" onClick={telaCheia} className="hidden rounded-lg p-2 text-stone-300 hover:bg-stone-800 hover:text-white sm:block">
            <Expand className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Fechar PDV" onClick={fecharPdv} className="rounded-lg p-2 text-stone-300 hover:bg-stone-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Corpo */}
      {mostrandoGrid ? (
        <main className="min-h-0 flex-1">
          <ComandasGrid
            comandas={comandas}
            chamados={chamados}
            onAtenderChamado={atenderChamado}
            onAbrir={abrirComandaExistente}
            onNova={() => setDlg("abrir")}
          />
        </main>
      ) : (
        <main className="flex min-h-0 flex-1">
          <section className={cn("min-h-0 flex-1", telaMobile === "conta" && "hidden lg:block")}>
            <CatalogoPdv ref={buscaRef} itens={props.itens} onAdicionar={adicionar} onAvulso={avulso} />
          </section>
          <aside className={cn("min-h-0 w-full border-l border-stone-200 lg:block lg:w-[400px] xl:w-[440px]", telaMobile === "produtos" && "hidden")}>
            {aba === "venda" ? contaVenda : contaComanda}
          </aside>
        </main>
      )}

      {/* Barra inferior do celular: produtos ⇄ conta */}
      {!mostrandoGrid && (
        <div className="flex border-t border-stone-200 bg-white lg:hidden" style={{ paddingBottom: telaMobile === "produtos" ? "env(safe-area-inset-bottom)" : undefined }}>
          {telaMobile === "produtos" ? (
            <button type="button" onClick={() => setTelaMobile("conta")} className="m-2 flex h-12 flex-1 items-center justify-between rounded-xl bg-stone-900 px-4 font-semibold text-white">
              <span>{aba === "comandas" && comanda ? (comanda.mesa ? rotuloMesa(comanda.mesa) : comanda.clienteNome) : "Ver conta"} · {qtdConta} item(ns)</span>
              <span className="tabular-nums">{brl(totalMobileC)}</span>
            </button>
          ) : (
            <button type="button" onClick={() => setTelaMobile("produtos")} className="m-2 flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold ring-1 ring-stone-300">
              <ArrowLeft className="h-4 w-4" /> Produtos
            </button>
          )}
        </div>
      )}

      {/* ---- diálogos ---- */}
      <LinhaDialog
        linha={linhaEditando?.linha ?? null}
        podeDesconto={podeDesconto}
        podeCancelar={podeCancelar}
        onClose={() => setEditando(null)}
        onSalvar={salvarLinha}
        onRemover={removerLinha}
      />

      <ClienteVendaDialog
        open={dlg === "cliente"}
        onOpenChange={(o) => setDlg(o ? "cliente" : null)}
        dados={dados}
        onSalvar={(d) => { setDados(d); setDlg(null) }}
        zonas={props.zonas}
        temPedidoOnline={props.temPedidoOnline}
        buscaClientes={props.buscaClientes}
      />

      {dlg === "desconto" && (
        <DescontoDialog
          open
          onOpenChange={(o) => !o && setDlg(null)}
          inicial={
            aba === "venda"
              ? desconto
              : comanda && (comanda.descontoPercentual != null
                ? { tipo: "percentual", valor: comanda.descontoPercentual }
                : comanda.desconto > 0 ? { tipo: "valor", valor: comanda.desconto } : null)
          }
          baseC={aba === "venda" ? totaisVenda.subtotalC : comanda ? centavos(comanda.subtotal) : 0}
          onSalvar={async (d) => {
            if (aba === "venda") {
              setDesconto(d)
              setDlg(null)
            } else if (await acaoComanda({ acao: "atualizar", desconto: d })) setDlg(null)
          }}
        />
      )}

      {dlg === "pagamento" && (aba === "venda" || comanda) && (
        <PagamentoDialog
          open
          onOpenChange={(o) => !o && setDlg(null)}
          modo={aba === "venda" ? "venda" : "comanda"}
          titulo={aba === "venda" ? "Receber venda" : `Receber · ${comanda!.mesa ? rotuloMesa(comanda!.mesa) : comanda!.clienteNome}`}
          totalC={aba === "venda" ? totaisVenda.totalC : centavos(comanda!.total)}
          pagamentosComanda={
            comanda && aba === "comandas"
              ? comanda.pagamentos.map((p) => ({ id: p.id, forma: p.forma, valorC: centavos(p.valor), recebidoC: p.recebido != null ? centavos(p.recebido) : null, pagante: p.pagante, estornado: !!p.estornadoEm }))
              : []
          }
          linhas={
            aba === "venda"
              ? linhas.map((l) => ({ chave: l.chave, valorC: valorLinhaC(l), quantidade: l.quantidade, titulo: l.titulo, detalhe: l.detalhe }))
              : comanda!.itens.map((i) => ({ chave: i.id, valorC: centavos(i.precoUnit) * i.quantidade - centavos(i.desconto), quantidade: i.quantidade, titulo: i.titulo, detalhe: i.variacaoNome }))
          }
          planoInicial={aba === "venda" ? planoVenda : ((comanda!.divisao as PlanoDivisao | null) ?? null)}
          onPlano={(p) => {
            if (aba === "venda") setPlanoVenda(p)
            else salvarPlanoComanda(p)
          }}
          onFinalizarVenda={finalizarVenda}
          onPagarComanda={(p, fechar) =>
            acaoComanda({ acao: "pagar", fechar, pagamento: { forma: p.forma, valor: p.valorC / 100, recebido: p.recebidoC != null ? p.recebidoC / 100 : null, pagante: p.pagante } })
          }
          onEstornar={(id, motivo) => acaoComanda({ acao: "estornar", pagamentoId: id, motivo }, "Pagamento estornado.")}
          podeCancelar={podeCancelar}
        />
      )}

      <AbrirComandaDialog
        open={dlg === "abrir"}
        onOpenChange={(o) => setDlg(o ? "abrir" : null)}
        servicoPct={servicoPct}
        mesasLivres={props.mesas.filter((m) => !comandas.some((c) => c.mesa?.toLowerCase() === m.nome.toLowerCase())).map((m) => m.nome)}
        onAbrir={async (d) => {
          const r = await enviarJson<ComandaDetalhe>("/api/comerciante/gestao/comandas", { mesa: d.mesa || null, nome: d.nome || null, cobrarServico: d.cobrarServico })
          if (!r.ok) {
            toast.error(r.erro)
            if (typeof r.data.comandaId === "string") {
              setDlg(null)
              await abrirComandaExistente(r.data.comandaId)
            }
            return
          }
          setDlg(null)
          setComanda(r.data)
          setPendentes([])
          setTelaMobile("produtos")
          atualizarLista()
          buscaRef.current?.focus()
        }}
      />

      {comanda && (
        <>
          <AbrirComandaDialog
            open={dlg === "editarComanda"}
            onOpenChange={(o) => setDlg(o ? "editarComanda" : null)}
            servicoPct={servicoPct}
            titulo="Mesa e nome"
            inicial={{ mesa: comanda.mesa ?? "", nome: comanda.clienteNome }}
            onAbrir={async (d) => {
              if (await acaoComanda({ acao: "atualizar", mesa: d.mesa || null, nome: d.nome || null }, "Comanda atualizada.")) setDlg(null)
            }}
          />

          <Dialog open={dlg === "opcoes"} onOpenChange={(o) => setDlg(o ? "opcoes" : null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Comanda #{comanda.numero}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2">
                <Opcao icon={MoveRight} onClick={() => setDlg("editarComanda")}>Transferir mesa / renomear</Opcao>
                <Opcao icon={Combine} onClick={() => { atualizarLista(); setDlg("juntar") }} disabled={comandas.length < 2}>Juntar outra comanda nesta</Opcao>
                <Opcao icon={Printer} onClick={() => { abrirCupom(comanda.id, true); setDlg(null) }}>Imprimir conferência</Opcao>
                <Opcao icon={Ban} onClick={() => setDlg("cancelar")} perigo>Cancelar comanda</Opcao>
              </div>
              <HistoricoComanda comanda={comanda} />
            </DialogContent>
          </Dialog>

          <Dialog open={dlg === "juntar"} onOpenChange={(o) => setDlg(o ? "juntar" : null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Trazer para a comanda #{comanda.numero}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-stone-600">Os itens e pagamentos da comanda escolhida passam para esta, e ela é encerrada.</p>
              <ul className="grid gap-2">
                {comandas.filter((c) => c.id !== comanda.id).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={async () => {
                        setOcupado(true)
                        try {
                          if (await acaoComanda({ acao: "juntar", origemId: c.id }, `Comanda #${c.numero} juntada.`)) setDlg(null)
                        } finally { setOcupado(false) }
                      }}
                      className="flex w-full items-center justify-between rounded-xl bg-stone-50 px-3 py-3 text-left ring-1 ring-stone-200 hover:ring-stone-400"
                    >
                      <span className="font-semibold">{c.mesa ? `Mesa ${c.mesa}` : c.clienteNome} <span className="font-normal text-stone-500">#{c.numero}</span></span>
                      <span className="tabular-nums">{brl(centavos(c.total))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>

          <CancelarComandaDialog
            open={dlg === "cancelar"}
            onOpenChange={(o) => setDlg(o ? "cancelar" : null)}
            temItens={comanda.itens.length > 0}
            podeCancelar={podeCancelar}
            onCancelar={async (motivo) => {
              if (await acaoComanda({ acao: "cancelar", motivo }, "Comanda cancelada.")) setDlg(null)
            }}
          />
        </>
      )}

      {props.podeConfigurar && (
        <ConfigDialog
          open={dlg === "config"}
          onOpenChange={(o) => setDlg(o ? "config" : null)}
          servicoPct={servicoPct}
          onSalvo={(pct) => { setServicoPct(pct); if (pct == null) setCobrarServico(false); setDlg(null) }}
        />
      )}

      <Dialog open={!!sucesso} onOpenChange={(o) => !o && setSucesso(null)}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          {sucesso && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <div>
                <p className="text-lg font-bold">{sucesso.comanda ? `Comanda #${sucesso.numero} fechada` : `Venda #${sucesso.numero} registrada`}</p>
                {sucesso.trocoC > 0 && <p className="mt-2 rounded-xl bg-emerald-50 py-3 text-3xl font-bold text-emerald-800">Troco {brl(sucesso.trocoC)}</p>}
              </div>
              <div className="grid gap-2">
                <button type="button" onClick={() => abrirCupom(sucesso.id)} className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold ring-1 ring-stone-300">
                  <Printer className="h-4 w-4" /> Imprimir cupom
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => { setSucesso(null); setTelaMobile("produtos"); setTimeout(() => buscaRef.current?.focus(), 50) }}
                  className="h-12 rounded-xl bg-stone-900 font-semibold text-white"
                >
                  {sucesso.comanda ? "Voltar às comandas" : "Nova venda"} <span className="text-xs font-normal opacity-70">Enter</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Opcao({ icon: Icon, children, onClick, perigo, disabled }: { icon: typeof Printer; children: React.ReactNode; onClick: () => void; perigo?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("flex h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ring-1 disabled:opacity-40", perigo ? "text-rose-700 ring-rose-200 hover:bg-rose-50" : "ring-stone-200 hover:bg-stone-50")}>
      <Icon className="h-4 w-4" /> {children}
    </button>
  )
}

function HistoricoComanda({ comanda }: { comanda: ComandaDetalhe }) {
  const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-medium text-stone-600">Histórico ({comanda.historico.length})</summary>
      <ol className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {comanda.historico.map((h) => (
          <li key={h.id} className="flex gap-2">
            <span className="w-10 shrink-0 tabular-nums text-stone-500">{hora(h.createdAt)}</span>
            <span>
              {h.descricao ?? (h.status === "ABERTA" ? "Comanda aberta" : h.status)}
              {h.autorNome && <span className="text-stone-500"> · {h.autorNome}</span>}
              {h.motivo && <span className="text-rose-600"> · {h.motivo}</span>}
            </span>
          </li>
        ))}
      </ol>
    </details>
  )
}

function CancelarComandaDialog({ open, onOpenChange, temItens, podeCancelar, onCancelar }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  temItens: boolean
  podeCancelar: boolean
  onCancelar: (motivo: string | null) => Promise<void>
}) {
  const [motivo, setMotivo] = useState("")
  const bloqueado = temItens && !podeCancelar
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar comanda?</DialogTitle>
        </DialogHeader>
        {bloqueado ? (
          <p className="text-sm text-stone-600">Comanda com itens só é cancelada por dono ou gerente.</p>
        ) : (
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await onCancelar(temItens ? motivo.trim() : motivo.trim() || null) }}>
            <p className="text-sm text-stone-600">{temItens ? "Os itens saem da conta e o cancelamento fica no histórico. Pagamentos precisam ser estornados antes." : "A comanda está vazia."}</p>
            <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={temItens ? "Motivo (obrigatório)" : "Motivo (opcional)"} maxLength={280} className="h-11 w-full rounded-lg border border-stone-300 px-3 text-[16px]" />
            <button type="submit" disabled={temItens && motivo.trim().length < 3} className="h-11 w-full rounded-lg bg-rose-600 font-semibold text-white disabled:opacity-40">Cancelar comanda</button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ConfigDialog({ open, onOpenChange, servicoPct, onSalvo }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  servicoPct: number | null
  onSalvo: (pct: number | null) => void
}) {
  const [valor, setValor] = useState(servicoPct != null ? String(servicoPct).replace(".", ",") : "")
  const [ativo, setAtivo] = useState(servicoPct != null)
  const n = parseReais(valor)
  const invalido = ativo && !(n > 0 && n <= MAX_PERCENTUAL_SERVICO)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurar PDV</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (invalido) return
            const pct = ativo ? Math.round(n * 100) / 100 : null
            const r = await enviarJson("/api/comerciante/gestao/pdv", { taxaServicoPct: pct }, "PATCH")
            if (!r.ok) return void toast.error(r.erro)
            toast.success("Configuração salva.")
            onSalvo(pct)
          }}
        >
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4" />
            Taxa de serviço
          </label>
          {ativo && (
            <div className="flex items-center gap-2">
              <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="10" className="h-11 w-24 rounded-lg border border-stone-300 px-3 text-right text-[16px]" />
              <span className="text-sm">%</span>
            </div>
          )}
          <p className="text-xs text-stone-500">Sugerida nas comandas e opcional na venda rápida. O cliente pode recusar — dá para desligar em cada conta.</p>
          <button type="submit" disabled={invalido} className="h-11 w-full rounded-lg bg-stone-900 font-semibold text-white disabled:opacity-40">Salvar</button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
