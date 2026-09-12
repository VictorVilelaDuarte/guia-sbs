import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { getPainelBase, getResumoData } from "@/lib/painel/queries"
import { temFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  BedDouble,
  BookOpen,
  ChevronRight,
  Lock,
  Package,
  ReceiptText,
} from "lucide-react"

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function dataHoje() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())
}

function Numero({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", destaque && "text-amber-600")}>
        {valor}
      </p>
    </div>
  )
}

function Atalho({
  href,
  icon: Icon,
  titulo,
  detalhe,
  bloqueado,
}: {
  href: string
  icon: typeof Package
  titulo: string
  detalhe: string
  bloqueado?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {titulo}
          {bloqueado && <Lock className="h-3 w-3 text-muted-foreground" />}
        </p>
        <p className="truncate text-xs text-muted-foreground">{detalhe}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  )
}

// Resumo do dia da área Gestão. Números de pedidos só com a feature
// pedido_online; os atalhos aparecem para todos.
export default async function GestaoResumoPage() {
  const base = await getPainelBase()
  if (!base) return null

  const { features } = base.comercio.plan
  const pedidoOnline = temFeature(features, "pedido_online")
  const temCardapio = temFeature(features, "cardapio")
  const hospedagem = base.comercio.categorias.includes("HOSPEDAGEM")
  const r = await getResumoData(base.comercio.id, { pedidos: pedidoOnline })

  const ticketMedio = r.hoje && r.hoje.concluidos > 0 ? r.hoje.faturamento / r.hoje.concluidos : 0

  return (
    <div className="space-y-6">
      {pedidoOnline && r.hoje ? (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">Hoje</h2>
              <span className="text-xs capitalize text-muted-foreground">{dataHoje()}</span>
            </div>

            {!r.aceitaPedidos && (
              <Link
                href="/comerciante/gestao/pedidos"
                className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Sua loja <strong>não está aceitando pedidos</strong>. Ligue em
                  Pedidos → Configuração.
                </span>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Numero label="Aguardando" valor={String(r.aguardando)} destaque={r.aguardando > 0} />
              <Numero label="Em andamento" valor={String(r.andamento)} />
              <Numero label="Pedidos hoje" valor={String(r.hoje.pedidos)} />
              <Numero label="Ticket médio" valor={formatBRL(ticketMedio)} />
            </div>

            <div className="rounded-lg bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">Faturamento de hoje</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{formatBRL(r.hoje.faturamento)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Soma dos {r.hoje.concluidos} pedido(s) concluído(s) feitos hoje pelo cardápio online.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Receba pedidos pelo seu cardápio</p>
              <p className="text-sm text-muted-foreground">
                Com o pedido online, este resumo mostra os pedidos e o faturamento do
                dia. Disponível no plano Premium.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Atalhos</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {pedidoOnline && (
            <Atalho
              href="/comerciante/gestao/pedidos"
              icon={ReceiptText}
              titulo="Pedidos"
              detalhe={r.aguardando > 0 ? `${r.aguardando} aguardando ação` : "Nenhum aguardando"}
            />
          )}
          <Atalho
            href="/comerciante/gestao/cardapio"
            icon={BookOpen}
            titulo="Cardápio"
            bloqueado={!temCardapio}
            detalhe={
              !temCardapio
                ? "Disponível no plano Premium"
                : r.indisponiveis > 0
                  ? `${r.itensCardapio} itens · ${r.indisponiveis} indisponível(is)`
                  : `${r.itensCardapio} itens`
            }
          />
          <Atalho
            href="/comerciante/gestao/produtos"
            icon={Package}
            titulo="Produtos e serviços"
            detalhe={`${r.produtos} produto(s) · ${r.servicos} serviço(s)`}
          />
          {hospedagem && (
            <Atalho
              href="/comerciante/gestao/acomodacoes"
              icon={BedDouble}
              titulo="Acomodações"
              detalhe={`${r.quartos} tipo(s) de quarto ativo(s)`}
            />
          )}
        </div>
      </div>
    </div>
  )
}
