import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ChevronRight, MonitorSmartphone, Printer } from "lucide-react"
import type { OrigemPedido } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { CancelarVenda } from "@/components/comerciante/vendas/cancelar-venda"
import { AbrirPdvLink } from "@/components/comerciante/pdv/abrir-pdv"
import { getPainelBase } from "@/lib/painel/queries"
import { hojeSP, listarVendasDoDia } from "@/lib/gestao/vendas"
import { temPermissao } from "@/lib/gestao/permissoes"
import { formaPagamentoLabel } from "@/lib/hospedagem"
import { ORIGEM_LABEL, STATUS_LABEL, STATUS_TOM, type StatusTom } from "@/lib/pedidos"
import { paraCentavos } from "@/lib/dinheiro"
import { temFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"

const TOM_CLS: Record<StatusTom, string> = {
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  rose: "bg-rose-100 text-rose-700",
  stone: "bg-stone-100 text-stone-700",
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function somaDias(dia: string, n: number) {
  const d = new Date(`${dia}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function diaLegivel(dia: string, hoje: string) {
  if (dia === hoje) return "Hoje"
  if (dia === somaDias(hoje, -1)) return "Ontem"
  const [a, m, d] = dia.split("-")
  return `${d}/${m}/${a}`
}

const hora = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(d)

export default async function VendasPage({ searchParams }: { searchParams: Promise<{ dia?: string; origem?: string }> }) {
  const [params, base] = await Promise.all([searchParams, getPainelBase()])
  if (!base) return null
  if (!temPermissao(base.permissoes, "vendas:registrar")) notFound()
  if (!temFeature(base.comercio.plan.features, "gestao_relatorios")) {
    return (
      <RecursoBloqueado
        titulo="Vendas"
        descricao="Registre vendas do balcão e do telefone e acompanhe tudo o que a loja vendeu no dia."
      />
    )
  }

  const hoje = hojeSP()
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(params.dia ?? "") && params.dia! <= hoje ? params.dia! : hoje
  const origem = (["ONLINE", "BALCAO", "TELEFONE", "COMANDA"] as const).find((o) => o === params.origem) ?? null
  const vendas = await listarVendasDoDia(base.comercio.id, { dia, origem: origem as OrigemPedido | null })
  const verValores = temPermissao(base.permissoes, "vendas:ver")
  const podeCancelar = temPermissao(base.permissoes, "vendas:cancelar")
  const concluidas = vendas.filter((v) => v.status === "CONCLUIDO")
  const totalC = concluidas.reduce((a, v) => a + paraCentavos(v.total), 0)

  const url = (muda: { dia?: string; origem?: string | null }) => {
    const p = new URLSearchParams()
    const d = muda.dia ?? dia
    const o = muda.origem === undefined ? origem : muda.origem
    if (d !== hoje) p.set("dia", d)
    if (o) p.set("origem", o)
    const qs = p.toString()
    return `/comerciante/gestao/vendas${qs ? `?${qs}` : ""}`
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Vendas</CardTitle>
            <p className="text-sm text-muted-foreground">
              {concluidas.length} concluída(s){verValores ? ` · ${brl(totalC)}` : ""}
            </p>
          </div>
          <AbrirPdvLink className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
            <MonitorSmartphone className="h-4 w-4" /> Abrir PDV
          </AbrirPdvLink>
        </div>
        <div className="flex items-center justify-between text-sm">
          <Link href={url({ dia: somaDias(dia, -1) })} className="inline-flex items-center gap-1 hover:underline"><ChevronLeft className="h-4 w-4" /> Anterior</Link>
          <span className="font-medium">{diaLegivel(dia, hoje)}</span>
          {dia < hoje ? (
            <Link href={url({ dia: somaDias(dia, 1) })} className="inline-flex items-center gap-1 hover:underline">Próximo <ChevronRight className="h-4 w-4" /></Link>
          ) : <span className="w-16" />}
        </div>
        <div className="flex flex-wrap gap-2">
          {([null, "ONLINE", "BALCAO", "TELEFONE", "COMANDA"] as const).map((o) => (
            <Link key={o ?? "todas"} href={url({ origem: o })} className={cn("rounded-full border px-3 py-1 text-sm", origem === o ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
              {o ? ORIGEM_LABEL[o] : "Todas"}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {vendas.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma venda neste dia.</p>
        ) : (
          <ul className="divide-y divide-border">
            {vendas.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold tabular-nums">#{v.numero}</span>
                    <span className="text-muted-foreground tabular-nums">{hora(v.createdAt)}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">{ORIGEM_LABEL[v.origem]}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", TOM_CLS[STATUS_TOM[v.status]])}>{STATUS_LABEL[v.status]}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.mesa ? `Mesa ${v.mesa} · ` : ""}{v.clienteNome}
                    {v.pagamentos.length > 0 && ` · ${[...new Set(v.pagamentos.map((p) => formaPagamentoLabel(p.forma)))].join(" + ")}`}
                    {v.criadoPorNome && ` · por ${v.criadoPorNome}`}
                  </p>
                  {v.motivoCancelamento && <p className="text-xs text-rose-500">✕ {v.motivoCancelamento}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {verValores && <span className={cn("font-semibold tabular-nums", v.status === "CANCELADO" && "text-muted-foreground line-through")}>{brl(paraCentavos(v.total))}</span>}
                  <div className="flex items-center gap-3">
                    {v.origem !== "ONLINE" && v.status !== "CANCELADO" && (
                      <a href={`/comerciante/pdv/cupom/${v.id}`} target="cupom" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                        <Printer className="h-3 w-3" /> {v.status === "ABERTA" ? "Conferência" : "Cupom"}
                      </a>
                    )}
                    {podeCancelar && v.origem !== "ONLINE" && v.status === "CONCLUIDO" && <CancelarVenda pedidoId={v.id} numero={v.numero} />}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
