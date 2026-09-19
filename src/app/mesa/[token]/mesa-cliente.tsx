"use client"

import { useEffect, useState } from "react"
import { BellRing, Check, ChefHat, Loader2, Plus, ReceiptText, RefreshCw, UtensilsCrossed } from "lucide-react"
import type { CardapioDaMesa, ContaDaMesa } from "@/lib/gestao/mesas"
import { rotuloMesa } from "@/lib/gestao/mesas-link"
import { cn } from "@/lib/utils"
import { PedidoSheet } from "./pedido-sheet"

const POLL_MS = 12000
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const hora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))

const ESTADO: Record<string, { label: string; cls: string }> = {
  aguardando: { label: "confirmando", cls: "bg-amber-100 text-amber-800" },
  producao: { label: "na cozinha", cls: "bg-sky-100 text-sky-800" },
  pronto: { label: "pronto", cls: "bg-emerald-100 text-emerald-800" },
}

// Página que o cliente vê ao escanear o QR da mesa: a conta em tempo real,
// "chamar o garçom" e "pedir a conta". Sem login e sem dado de outras pessoas.
export function MesaCliente({ inicial, cardapio, token }: { inicial: ContaDaMesa; cardapio: CardapioDaMesa | null; token: string }) {
  const [conta, setConta] = useState(inicial)
  const [enviando, setEnviando] = useState<null | "GARCOM" | "CONTA">(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pedindo, setPedindo] = useState(false)
  const [meuNome, setMeuNome] = useState("")

  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch(`/api/mesa/${token}`, { cache: "no-store" }).catch(() => null)
      if (r?.ok) setConta(await r.json())
    }, POLL_MS)
    return () => clearInterval(t)
  }, [token])

  async function chamar(tipo: "GARCOM" | "CONTA") {
    setEnviando(tipo)
    setAviso(null)
    try {
      const r = await fetch(`/api/mesa/${token}/chamado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) return setAviso(data.error ?? "Não foi possível avisar a equipe. Chame pelo salão.")
      if (data.conta) setConta(data.conta)
      setAviso(data.repetido ? "A equipe já foi avisada — estão a caminho." : tipo === "GARCOM" ? "Pronto! Um atendente vem até a mesa." : "Pedido de conta enviado. Já levamos até você.")
    } finally {
      setEnviando(null)
    }
  }

  const c = conta.comanda
  const chamado = conta.chamadoPendente
  // Pedir exige cardápio liberado e, sem conta aberta, que a loja deixe o cliente abrir.
  const podePedir = conta.permite.pedido && !!cardapio && (!!c || conta.permite.abrirConta)
  const aguardando = c?.itens.filter((i) => i.estado === "aguardando") ?? []

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-stone-50 text-stone-900">
      <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        {conta.loja.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo pode vir de qualquer origem cadastrada
          <img src={conta.loja.logo} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
            <UtensilsCrossed className="h-5 w-5 text-stone-500" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{conta.loja.nome}</p>
          <p className="text-sm text-stone-500">
            {rotuloMesa(conta.mesa.nome)}
            {conta.mesa.area ? ` · ${conta.mesa.area}` : ""}
          </p>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4">
        {podePedir ? (
          <button
            type="button"
            onClick={() => setPedindo(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-stone-900 p-4 text-left font-semibold text-white"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Fazer pedido pelo celular
            </span>
            <span className="text-sm font-normal opacity-80">cardápio →</span>
          </button>
        ) : (
          conta.loja.temCardapio && (
            <a
              href={`/vitrine/${conta.loja.slug}/cardapio?src=qr`}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"
            >
              <span className="font-semibold">Ver o cardápio</span>
              <span className="text-sm text-stone-500">abrir →</span>
            </a>
          )
        )}

        {c ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Sua conta</h2>
              <span className="text-xs text-stone-500">aberta às {hora(c.abertaEm)}</span>
            </div>
            <ul className="mt-3 divide-y divide-stone-100">
              {c.itens.map((i) => {
                const e = ESTADO[i.estado]
                return (
                  <li key={i.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium tabular-nums">{i.quantidade}×</span> {i.titulo}
                      {i.variacaoNome && <span className="text-stone-500"> · {i.variacaoNome}</span>}
                      {e && <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", e.cls)}>{e.label}</span>}
                      {i.complementos.length > 0 && <span className="block text-xs text-stone-500">+ {i.complementos.join(", ")}</span>}
                      {i.observacao && <span className="block text-xs italic text-stone-500">↳ {i.observacao}</span>}
                    </span>
                    <span className="shrink-0 tabular-nums">{brl(i.valor)}</span>
                  </li>
                )
              })}
              {c.itens.length === 0 && <li className="py-3 text-sm text-stone-500">Nada lançado ainda.</li>}
            </ul>

            <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
              <Linha rotulo="Subtotal" valor={brl(c.subtotal)} />
              {c.desconto > 0 && <Linha rotulo="Desconto" valor={`− ${brl(c.desconto)}`} classe="text-emerald-700" />}
              {c.taxaServico > 0 && <Linha rotulo={`Serviço (${String(c.servicoPercentual ?? "").replace(".", ",")}%)`} valor={brl(c.taxaServico)} />}
              {c.pago > 0 && <Linha rotulo="Já pago" valor={`− ${brl(c.pago)}`} classe="text-emerald-700" />}
              <div className="flex items-baseline justify-between pt-1">
                <span className="font-semibold">{c.pago > 0 ? "Falta" : "Total"}</span>
                <span className="text-2xl font-bold tabular-nums">{brl(c.saldo)}</span>
              </div>
            </dl>

            {c.pessoas.length > 0 && (
              <div className="mt-3 rounded-xl bg-stone-50 p-3">
                <p className="text-xs font-semibold text-stone-600">Divisão combinada</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {c.pessoas.map((p) => (
                    <li key={p.nome} className="flex justify-between">
                      <span>{p.nome}</span>
                      <span className="tabular-nums">{brl(p.valor)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.taxaServico > 0 && <p className="mt-2 text-xs text-stone-500">A taxa de serviço é opcional — fale com o atendente se preferir retirar.</p>}
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-stone-200">
            <ReceiptText className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-2 font-semibold">Nenhuma conta aberta nesta mesa</p>
            <p className="mt-1 text-sm text-stone-600">
              {podePedir
                ? "Faça o seu pedido pelo celular ou chame o atendente."
                : conta.permite.chamarGarcom
                  ? "Chame o atendente para começar o seu pedido."
                  : "Fale com o atendente para começar o seu pedido."}
            </p>
          </section>
        )}

        {aguardando.length > 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {aguardando.reduce((a, i) => a + i.quantidade, 0)} item(ns) esperando o atendente confirmar. Eles entram na conta depois da confirmação.
          </p>
        )}
        {chamado && (
          <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <BellRing className="h-4 w-4 shrink-0" />
            {chamado.tipo === "CONTA" ? "Conta pedida" : "Atendente chamado"} às {hora(chamado.criadoEm)} — a equipe já foi avisada.
          </p>
        )}
        {aviso && (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <Check className="h-4 w-4 shrink-0" /> {aviso}
          </p>
        )}
      </main>

      {pedindo && cardapio && (
        <PedidoSheet
          cardapio={cardapio}
          token={token}
          nomeSalvo={meuNome}
          onFechar={() => setPedindo(false)}
          onEnviado={(nova, nome) => {
            setConta(nova)
            setMeuNome(nome)
            setPedindo(false)
            setAviso("Pedido enviado! O atendente vai confirmar em instantes.")
          }}
        />
      )}

      {(conta.permite.chamarGarcom || conta.permite.pedirConta) && (
        <footer className="sticky bottom-0 grid gap-2 border-t border-stone-200 bg-white p-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          <div className="grid grid-cols-2 gap-2">
            {conta.permite.chamarGarcom && (
              <Botao onClick={() => chamar("GARCOM")} carregando={enviando === "GARCOM"} icone={<BellRing className="h-4 w-4" />} rotulo="Chamar atendente" />
            )}
            {conta.permite.pedirConta && (
              <Botao onClick={() => chamar("CONTA")} carregando={enviando === "CONTA"} icone={<ReceiptText className="h-4 w-4" />} rotulo="Pedir a conta" primario />
            )}
          </div>
          <p className="flex items-center justify-center gap-1 text-[11px] text-stone-400">
            <RefreshCw className="h-3 w-3" /> a conta atualiza sozinha
            <ChefHat className="ml-2 h-3 w-3" /> {conta.loja.nome}
          </p>
        </footer>
      )}
    </div>
  )
}

function Linha({ rotulo, valor, classe }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <div className={cn("flex justify-between", classe)}>
      <dt className="text-stone-600">{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  )
}

function Botao({ onClick, carregando, icone, rotulo, primario }: { onClick: () => void; carregando: boolean; icone: React.ReactNode; rotulo: string; primario?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={carregando}
      className={cn(
        "flex h-14 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-60",
        primario ? "bg-stone-900 text-white" : "bg-white ring-1 ring-stone-300",
      )}
    >
      {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : icone}
      {rotulo}
    </button>
  )
}
