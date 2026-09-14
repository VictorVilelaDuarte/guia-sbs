import Link from "next/link"
import { notFound } from "next/navigation"
import { Cake, ChevronLeft, ChevronRight, MessageCircle, Search, UserX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClienteDialog } from "@/components/comerciante/clientes/cliente-dialog"
import { ClientesPrevia } from "@/components/comerciante/clientes/clientes-previa"
import { AcessosAdmin } from "@/components/comerciante/clientes/acessos-admin"
import {
  formatAniversario,
  formatBRL,
  formatWhatsapp,
  haQuanto,
  linkWhatsapp,
} from "@/components/comerciante/clientes/formato"
import { getPainelBase } from "@/lib/painel/queries"
import {
  listarAcessosAdmin,
  listarClientes,
  registrarAcessoAdmin,
  resumoClientesPrevia,
  type FiltroClientes,
  type OrdemClientes,
} from "@/lib/gestao/clientes-dados"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"

type Params = { q?: string; filtro?: string; tag?: string; ordem?: string; pagina?: string }

// URL da lista preservando os filtros atuais (voltar do detalhe não perde a lista).
function urlLista(atual: Params, muda: Partial<Params>) {
  const p = new URLSearchParams()
  const final = { ...atual, ...muda }
  for (const [k, v] of Object.entries(final)) if (v) p.set(k, v)
  const qs = p.toString()
  return `/comerciante/gestao/clientes${qs ? `?${qs}` : ""}`
}

function Chip({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        ativo ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30",
      )}
    >
      {children}
    </Link>
  )
}

export default async function GestaoClientesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [params, base] = await Promise.all([searchParams, getPainelBase()])
  if (!base) return null
  if (!temPermissao(base.permissoes, "clientes:ver")) notFound()

  if (!temFeature(base.comercio.plan.features, "gestao_clientes")) {
    // Prévia com números reais e lista fictícia (nenhum dado pessoal no HTML).
    return (
      <ClientesPrevia
        numeros={await resumoClientesPrevia(base.comercio.id)}
        temPedidoOnline={temFeature(base.comercio.plan.features, "pedido_online")}
      />
    )
  }

  const filtro: FiltroClientes | null =
    params.filtro === "sumidos" || params.filtro === "aniversariantes" ? params.filtro : null
  const ordem: OrdemClientes = params.ordem === "gasto" || params.ordem === "nome" ? params.ordem : "recente"
  const pagina = Math.max(1, Number(params.pagina) || 1)
  const atual: Params = { q: params.q, filtro: filtro ?? undefined, tag: params.tag, ordem: ordem === "recente" ? undefined : ordem }

  const { itens, total, paginas, tags } = await listarClientes(base.comercio.id, {
    busca: params.q,
    filtro,
    tag: params.tag || null,
    ordem,
    pagina,
  })
  const podeEditar = temPermissao(base.permissoes, "clientes:editar")
  await registrarAcessoAdmin(base.ctx, "LISTA")
  // Transparência para o dono: acessos do admin do guia aos dados dos clientes.
  const acessos = temPermissao(base.permissoes, "equipe:gerenciar") ? await listarAcessosAdmin(base.comercio.id) : null

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Clientes</CardTitle>
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? "cliente" : "clientes"}
              {filtro || params.q || params.tag ? " encontrados" : ""}
            </p>
          </div>
          {podeEditar && <ClienteDialog />}
        </div>

        {/* Busca por GET: estado na URL, sem JavaScript */}
        <form action="/comerciante/gestao/clientes" className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Buscar por nome ou WhatsApp"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {filtro && <input type="hidden" name="filtro" value={filtro} />}
          {params.tag && <input type="hidden" name="tag" value={params.tag} />}
          {atual.ordem && <input type="hidden" name="ordem" value={atual.ordem} />}
        </form>

        <div className="flex flex-wrap gap-2">
          <Chip href={urlLista(atual, { filtro: undefined, pagina: undefined })} ativo={!filtro}>Todos</Chip>
          <Chip href={urlLista(atual, { filtro: "sumidos", pagina: undefined })} ativo={filtro === "sumidos"}>
            <UserX className="h-3.5 w-3.5" /> Sumidos há 30+ dias
          </Chip>
          <Chip href={urlLista(atual, { filtro: "aniversariantes", pagina: undefined })} ativo={filtro === "aniversariantes"}>
            <Cake className="h-3.5 w-3.5" /> Aniversariantes do mês
          </Chip>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {filtro !== "aniversariantes" && (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">Ordenar:</span>
              {([["recente", "último pedido"], ["gasto", "maior gasto"], ["nome", "nome"]] as const).map(([o, label]) => (
                <Link
                  key={o}
                  href={urlLista(atual, { ordem: o === "recente" ? undefined : o, pagina: undefined })}
                  className={cn("rounded px-1.5 py-0.5", ordem === o ? "bg-muted font-semibold" : "hover:underline")}
                >
                  {label}
                </Link>
              ))}
            </span>
          )}
          {tags.length > 0 && (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">Tag:</span>
              {params.tag && (
                <Link href={urlLista(atual, { tag: undefined, pagina: undefined })} className="rounded px-1.5 py-0.5 hover:underline">
                  todas
                </Link>
              )}
              {tags.map((t) => (
                <Link
                  key={t}
                  href={urlLista(atual, { tag: t, pagina: undefined })}
                  className={cn("rounded-full px-2 py-0.5 text-xs", params.tag === t ? "bg-primary text-primary-foreground" : "bg-stone-100 text-stone-700")}
                >
                  {t}
                </Link>
              ))}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {itens.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {total === 0 && !filtro && !params.q && !params.tag
              ? "Nenhum cliente ainda. Eles aparecem aqui a cada pedido online — ou cadastre um cliente de balcão."
              : "Nenhum cliente com esses filtros."}
          </p>
        ) : (
          itens.map((c) => {
            const whats = linkWhatsapp(c.whatsapp)
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <Link href={`/comerciante/gestao/clientes/${c.id}`} className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    {c.nome}
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-normal text-stone-700">{t}</span>
                    ))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhatsapp(c.whatsapp) ?? "sem WhatsApp"}
                    {filtro === "aniversariantes" && c.aniversario && ` · 🎂 ${formatAniversario(c.aniversario)}`}
                  </p>
                  <p className="mt-0.5 text-xs">
                    {c.pedidos} {c.pedidos === 1 ? "pedido" : "pedidos"} · {formatBRL(c.gasto)}
                    {c.ultimoPedido && <span className="text-muted-foreground"> · último {haQuanto(c.ultimoPedido)}</span>}
                  </p>
                </Link>
                {whats && (
                  <a href={whats} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${c.nome}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-green-600 hover:bg-green-50">
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
              </div>
            )
          })
        )}

        {paginas > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm">
            {pagina > 1 ? (
              <Link href={urlLista(atual, { pagina: String(pagina - 1) })} className="inline-flex items-center gap-1 hover:underline">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Link>
            ) : <span />}
            <span className="text-muted-foreground">Página {pagina} de {paginas}</span>
            {pagina < paginas ? (
              <Link href={urlLista(atual, { pagina: String(pagina + 1) })} className="inline-flex items-center gap-1 hover:underline">
                Próxima <ChevronRight className="h-4 w-4" />
              </Link>
            ) : <span />}
          </div>
        )}
        {acessos && acessos.length > 0 && (
          <div className="pt-4">
            <AcessosAdmin
              acessos={acessos}
              descricao="Quando a equipe do guia acessa os dados dos seus clientes para dar suporte, fica registrado aqui."
            />
          </div>
        )}

      </CardContent>
    </Card>
  )
}
