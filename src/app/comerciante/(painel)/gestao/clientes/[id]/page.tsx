import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, MessageCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { ClienteDialog } from "@/components/comerciante/clientes/cliente-dialog"
import { ExcluirCliente } from "@/components/comerciante/clientes/excluir-cliente"
import {
  formatAniversario,
  formatBRL,
  formatData,
  formatWhatsapp,
  haQuanto,
  linkWhatsapp,
} from "@/components/comerciante/clientes/formato"
import { getPainelBase } from "@/lib/painel/queries"
import { detalheCliente, registrarAcessoAdmin } from "@/lib/gestao/clientes-dados"
import { temPermissao } from "@/lib/gestao/permissoes"
import { STATUS_LABEL, STATUS_TOM, type StatusTom } from "@/lib/pedidos"
import { temFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"

const TOM_CLS: Record<StatusTom, string> = {
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  rose: "bg-rose-100 text-rose-700",
  stone: "bg-stone-100 text-stone-700",
}

function Numero({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{valor}</p>
    </div>
  )
}

export default async function GestaoClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, base] = await Promise.all([params, getPainelBase()])
  if (!base) return null
  if (!temPermissao(base.permissoes, "clientes:ver")) notFound()
  if (!temFeature(base.comercio.plan.features, "gestao_clientes")) {
    return <RecursoBloqueado titulo="Clientes" descricao="Veja quem compra com você e o histórico de cada cliente." />
  }

  // Filtra pelo comércio do contexto: cliente de outra loja (inclusive do mesmo dono) = 404.
  const dados = await detalheCliente(base.comercio.id, id)
  if (!dados) notFound()
  await registrarAcessoAdmin(base.ctx, "DETALHE", id)
  const { cliente, stats, topItens, pedidos } = dados
  const podeEditar = temPermissao(base.permissoes, "clientes:editar")
  const whats = linkWhatsapp(cliente.whatsapp)

  return (
    <div className="space-y-4">
      <Link href="/comerciante/gestao/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Clientes
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg">{cliente.nome}</CardTitle>
              <p className="text-sm text-muted-foreground">Cliente desde {formatData(cliente.createdAt)}</p>
              {cliente.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {cliente.tags.map((t) => (
                    <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {whats && (
                <a href={whats} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-green-700 hover:bg-green-50">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {podeEditar && (
                <ClienteDialog
                  cliente={{
                    id: cliente.id,
                    nome: cliente.nome,
                    whatsapp: cliente.whatsapp,
                    email: cliente.email,
                    aniversario: cliente.aniversario,
                    observacoes: cliente.observacoes,
                    tags: cliente.tags,
                  }}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">WhatsApp</dt>
              <dd>{formatWhatsapp(cliente.whatsapp) ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="truncate">{cliente.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Aniversário</dt>
              <dd>{formatAniversario(cliente.aniversario) ?? "—"}</dd>
            </div>
          </dl>
          {cliente.observacoes && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 whitespace-pre-line">{cliente.observacoes}</div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero label="Pedidos concluídos" valor={String(stats.pedidos)} />
        <Numero label="Total gasto" valor={formatBRL(stats.gasto)} />
        <Numero label="Ticket médio" valor={formatBRL(stats.ticketMedio)} />
        <Numero label="Último pedido" valor={haQuanto(stats.ultimoPedido) ?? "—"} />
      </div>

      {topItens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mais pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1.5 text-sm">
              {topItens.map((i) => (
                <li key={i.titulo} className="flex justify-between gap-3">
                  <span>{i.titulo}</span>
                  <span className="tabular-nums text-muted-foreground">{i.quantidade}×</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos</CardTitle>
          <p className="text-sm text-muted-foreground">Últimos 20 pedidos deste cliente.</p>
        </CardHeader>
        <CardContent>
          {pedidos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido pelo cardápio online ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pedidos.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">#{p.numero}</span>
                    <span className="text-muted-foreground">{formatData(p.createdAt)}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", TOM_CLS[STATUS_TOM[p.status]])}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatBRL(p.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {podeEditar && (
        <div className="flex justify-end">
          <ExcluirCliente clienteId={cliente.id} nome={cliente.nome} />
        </div>
      )}
    </div>
  )
}
