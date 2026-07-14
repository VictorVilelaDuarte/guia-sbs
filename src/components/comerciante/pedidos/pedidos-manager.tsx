"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Bike, Store, MessageCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { formaPagamentoLabel } from "@/lib/hospedagem"
import {
  STATUS_LABEL,
  STATUS_TOM,
  transicoesValidas,
  grupoDoStatus,
  exigeMotivo,
  type StatusTom,
  type GrupoPedido,
} from "@/lib/pedidos"
import type { PedidoStatus } from "@prisma/client"
import type { PedidoAdmin } from "./types"
import { PushToggle } from "./push-toggle"

const POLL_MS = 15000

const TOM_CLS: Record<StatusTom, string> = {
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  rose: "bg-rose-100 text-rose-700",
  stone: "bg-stone-100 text-stone-700",
}

// Rótulo da AÇÃO (não do status de destino).
const ACAO_LABEL: Record<PedidoStatus, string> = {
  AGUARDANDO: "Aguardando",
  ACEITO: "Aceitar",
  EM_PREPARO: "Iniciar preparo",
  PRONTO: "Marcar pronto",
  SAIU_ENTREGA: "Saiu para entrega",
  CONCLUIDO: "Concluir",
  RECUSADO: "Recusar",
  CANCELADO: "Cancelar",
}

const GRUPOS: { id: GrupoPedido; label: string }[] = [
  { id: "novos", label: "Novos" },
  { id: "andamento", label: "Em andamento" },
  { id: "encerrados", label: "Encerrados" },
]

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function hora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

// Beep curto via Web Audio (sem asset). Só soa após interação do usuário.
function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => ctx.close()
  } catch {
    // sem áudio disponível — segue sem som
  }
}

export function PedidosManager({
  pedidosIniciais,
}: {
  pedidosIniciais: PedidoAdmin[]
}) {
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>(pedidosIniciais)
  const [filtro, setFiltro] = useState<GrupoPedido>("novos")
  const [novos, setNovos] = useState(0)
  const idsRef = useRef<Set<string>>(new Set(pedidosIniciais.map((p) => p.id)))

  // Polling — busca a lista e detecta novos pedidos AGUARDANDO.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/comerciante/pedidos", { cache: "no-store" })
        if (!res.ok) return
        const data: PedidoAdmin[] = await res.json()
        let novosCount = 0
        for (const p of data) {
          if (!idsRef.current.has(p.id)) {
            idsRef.current.add(p.id)
            if (p.status === "AGUARDANDO") novosCount++
          }
        }
        setPedidos(data)
        if (novosCount > 0) {
          beep()
          setNovos((n) => n + novosCount)
        }
      } catch {
        // mantém o estado atual; tenta de novo no próximo tick
      }
    }, POLL_MS)
    return () => clearInterval(id)
  }, [])

  // Pisca o título da janela enquanto houver novos não vistos.
  useEffect(() => {
    if (novos <= 0) return
    const original = document.title
    let on = false
    const id = setInterval(() => {
      on = !on
      document.title = on ? `🔔 ${novos} novo(s) pedido(s)` : original
    }, 1000)
    const limpar = () => setNovos(0)
    window.addEventListener("focus", limpar)
    return () => {
      clearInterval(id)
      document.title = original
      window.removeEventListener("focus", limpar)
    }
  }, [novos])

  async function mudarStatus(pedido: PedidoAdmin, novoStatus: PedidoStatus) {
    let motivo: string | undefined
    if (exigeMotivo(novoStatus)) {
      const m = window.prompt(
        novoStatus === "RECUSADO" ? "Motivo da recusa:" : "Motivo do cancelamento:",
      )
      if (m === null) return
      motivo =
        m.trim() ||
        (novoStatus === "RECUSADO" ? "Recusado pela loja" : "Cancelado pela loja")
    }
    try {
      const res = await fetch(`/api/comerciante/pedidos/${pedido.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus, motivoCancelamento: motivo }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Erro ao atualizar.")
        return
      }
      const upd = await res.json()
      setPedidos((arr) =>
        arr.map((p) =>
          p.id === pedido.id
            ? { ...p, status: upd.status, motivoCancelamento: upd.motivoCancelamento }
            : p,
        ),
      )
    } catch {
      toast.error("Falha de conexão.")
    }
  }

  const contagens: Record<GrupoPedido, number> = {
    novos: 0,
    andamento: 0,
    encerrados: 0,
  }
  for (const p of pedidos) contagens[grupoDoStatus(p.status)]++

  const visiveis = pedidos.filter((p) => grupoDoStatus(p.status) === filtro)

  return (
    <div className="space-y-4">
      <PushToggle />

      {/* Tabs de grupo */}
      <div className="flex gap-2">
        {GRUPOS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setFiltro(g.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              filtro === g.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30",
            )}
          >
            {g.label}
            {contagens[g.id] > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold",
                  filtro === g.id
                    ? "bg-primary-foreground/20"
                    : g.id === "novos"
                      ? "bg-amber-500 text-white"
                      : "bg-muted",
                )}
              >
                {contagens[g.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {filtro === "novos"
            ? "Nenhum pedido novo no momento."
            : "Nada por aqui."}
        </p>
      ) : (
        <div className="space-y-3">
          {visiveis.map((p) => (
            <PedidoCard key={p.id} pedido={p} onStatus={mudarStatus} />
          ))}
        </div>
      )}
    </div>
  )
}

function PedidoCard({
  pedido,
  onStatus,
}: {
  pedido: PedidoAdmin
  onStatus: (p: PedidoAdmin, s: PedidoStatus) => void
}) {
  const entrega = pedido.tipoEntrega === "ENTREGA"
  const proximos = transicoesValidas(pedido.status, pedido.tipoEntrega)
  const positivos = proximos.filter((s) => !exigeMotivo(s))
  const negativos = proximos.filter((s) => exigeMotivo(s))
  const whats = pedido.clienteWhats.replace(/\D/g, "")

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">#{pedido.numero}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                TOM_CLS[STATUS_TOM[pedido.status]],
              )}
            >
              {STATUS_LABEL[pedido.status]}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {hora(pedido.createdAt)} ·{" "}
            {entrega ? (
              <span className="inline-flex items-center gap-1">
                <Bike className="h-3 w-3" /> Entrega
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Store className="h-3 w-3" /> Retirada
              </span>
            )}
          </p>
        </div>
        <span className="font-bold tabular-nums">{formatBRL(pedido.total)}</span>
      </div>

      {/* Cliente */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{pedido.clienteNome}</span>
        {whats && (
          <a
            href={`https://wa.me/55${whats}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        )}
      </div>

      {/* Itens */}
      <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
        {pedido.itens.map((i) => (
          <li key={i.id}>
            <span className="font-medium text-foreground tabular-nums">
              {i.quantidade}×
            </span>{" "}
            {i.titulo}
            {i.variacaoNome && ` (${i.variacaoNome})`}
            {i.observacao && (
              <span className="block pl-5 text-xs italic">↳ {i.observacao}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Entrega / pagamento */}
      <div className="mt-2 space-y-0.5 border-t border-border pt-2 text-xs text-muted-foreground">
        {entrega && pedido.endereco && (
          <p>
            📍 {pedido.endereco}, {pedido.numeroEnd}
            {pedido.complemento && ` · ${pedido.complemento}`} · {pedido.bairro}
            {pedido.referencia && ` · Ref: ${pedido.referencia}`}
          </p>
        )}
        <p>
          💳 {formaPagamentoLabel(pedido.formaPagamento)}
          {pedido.trocoPara != null && ` · troco p/ ${formatBRL(pedido.trocoPara)}`}
        </p>
        {pedido.observacoes && <p>📝 {pedido.observacoes}</p>}
        {pedido.motivoCancelamento && (
          <p className="text-rose-500">✕ {pedido.motivoCancelamento}</p>
        )}
      </div>

      {/* Ações */}
      {proximos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {positivos.map((s) => (
            <Button key={s} size="sm" onClick={() => onStatus(pedido, s)}>
              {ACAO_LABEL[s]}
            </Button>
          ))}
          {negativos.map((s) => (
            <Button
              key={s}
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-rose-600"
              onClick={() => onStatus(pedido, s)}
            >
              {ACAO_LABEL[s]}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
