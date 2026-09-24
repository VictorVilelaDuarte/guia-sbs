import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getInicioData, getPainelBase } from "@/lib/painel/queries"
import { temFeature } from "@/lib/plan-features"
import { temPermissao } from "@/lib/gestao/permissoes"
import { passosCompletude } from "@/lib/painel/completude"
import { cn } from "@/lib/utils"
import { AbrirPdvLink } from "@/components/comerciante/pdv/abrir-pdv"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  EyeOff,
  MessageCircle,
  MonitorSmartphone,
  Navigation,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

// Início do painel — a entrada de todo mundo (comerciante e admin gerenciando).
// Cartões conforme plano e papel; cartão sem nada a mostrar não aparece:
// Precisa de atenção · Hoje · Sua vitrine · Complete seu perfil · Conheça o Premium.
// A navegação fica no menu (painel-nav.tsx) — aqui não há lista de atalhos.

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function dataHoje() {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  )
}

const STATUS_AVISO: Record<string, string> = {
  PENDENTE: "Seu perfil está aguardando a aprovação da equipe do guia. Enquanto isso, ele não aparece para os visitantes.",
  INATIVO: "Seu perfil está inativo e não aparece para os visitantes. Fale com a equipe do guia.",
  REJEITADO: "Seu perfil não foi aprovado. Fale com a equipe do guia para saber o que ajustar.",
}

const BENEFICIOS_PREMIUM = [
  "Pedido online pelo cardápio, com aviso de pedido novo",
  "PDV com comandas, QR Code na mesa e tela da cozinha",
  "Relatórios de vendas e cadastro de clientes",
  "Eventos na agenda da cidade, destaque no guia e fotos sem limite",
]

export default async function InicioPage() {
  const base = await getPainelBase()
  if (!base) return null

  const { features } = base.comercio.plan
  const { permissoes } = base
  const operaPedidos = temFeature(features, "pedido_online") && temPermissao(permissoes, "pedidos:operar")
  const registraVendas = temFeature(features, "gestao_relatorios") && temPermissao(permissoes, "vendas:registrar")
  const verVendas = temPermissao(permissoes, "vendas:ver")
  const cuidaCardapio = temFeature(features, "cardapio") && temPermissao(permissoes, "cardapio:editar", "itens:disponibilidade")
  const cuidaVitrine = temPermissao(permissoes, "vitrine:editar")
  const verVisitas = temPermissao(permissoes, "analytics:ver")
  // Quem decide o plano: só o dono vê o convite para o Premium.
  const mostraPremium = base.comercio.plan.slug === "free" && temPermissao(permissoes, "equipe:gerenciar")

  const r = await getInicioData(base.comercio.id, {
    pedidos: operaPedidos,
    vendas: registraVendas,
    cardapio: cuidaCardapio,
    visitas: verVisitas,
    perfil: cuidaVitrine,
  })

  // ---- Precisa de atenção
  const avisos: { texto: React.ReactNode; href?: string; icon: typeof AlertTriangle }[] = []
  if (cuidaVitrine && STATUS_AVISO[base.comercio.status]) {
    avisos.push({ texto: STATUS_AVISO[base.comercio.status], icon: Clock })
  }
  if (operaPedidos && !r.aceitaPedidos && temPermissao(permissoes, "pedidos:configurar")) {
    avisos.push({
      texto: (
        <>
          Sua loja <strong>não está aceitando pedidos</strong> online. Ligue em Pedidos → Configuração.
        </>
      ),
      href: "/comerciante/gestao/pedidos",
      icon: AlertTriangle,
    })
  }
  if (operaPedidos && r.aguardando > 0) {
    avisos.push({
      texto: (
        <>
          <strong>{r.aguardando}</strong> {r.aguardando === 1 ? "pedido aguardando" : "pedidos aguardando"} confirmação.
        </>
      ),
      href: "/comerciante/gestao/pedidos",
      icon: ReceiptText,
    })
  }
  if (cuidaCardapio && r.indisponiveis > 0) {
    avisos.push({
      texto: `${r.indisponiveis} ${r.indisponiveis === 1 ? "item do cardápio está oculto" : "itens do cardápio estão ocultos"} (indisponíveis).`,
      href: "/comerciante/gestao/cardapio",
      icon: EyeOff,
    })
  }

  const passos = r.perfil ? passosCompletude(r.perfil) : []
  const pendentes = passos.filter((p) => !p.ok)
  const ticketMedio = r.hoje && r.hoje.concluidos > 0 ? r.hoje.faturamento / r.hoje.concluidos : 0

  return (
    <div className="space-y-6">
      {avisos.length > 0 && (
        <Card className="ring-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Precisa de atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {avisos.map((a, i) => {
              const conteudo = (
                <>
                  <a.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span className="flex-1">{a.texto}</span>
                  {a.href && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
                </>
              )
              const cls = "flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
              return a.href ? (
                <Link key={i} href={a.href} className={cn(cls, "hover:bg-amber-100")}>
                  {conteudo}
                </Link>
              ) : (
                <div key={i} className={cls}>
                  {conteudo}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {(operaPedidos || registraVendas) && r.hoje && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Hoje</h2>
                <span className="text-xs capitalize text-muted-foreground">{dataHoje()}</span>
              </div>
              {registraVendas && (
                <AbrirPdvLink className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                  <MonitorSmartphone className="h-4 w-4" /> Abrir PDV
                </AbrirPdvLink>
              )}
            </div>

            <div className={cn("grid grid-cols-2 gap-3", operaPedidos && verVendas ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
              {operaPedidos && <Numero label="Aguardando" valor={String(r.aguardando)} destaque={r.aguardando > 0} />}
              {operaPedidos && <Numero label="Em andamento" valor={String(r.andamento)} />}
              <Numero label={operaPedidos ? "Pedidos hoje" : "Vendas hoje"} valor={String(r.hoje.pedidos)} />
              {registraVendas && !operaPedidos && <Numero label="Comandas abertas" valor={String(r.comandasAbertas)} />}
              {verVendas && <Numero label="Ticket médio" valor={brl(ticketMedio)} />}
            </div>

            {verVendas && (
              <div className="rounded-lg bg-muted/60 p-4">
                <p className="text-xs text-muted-foreground">Faturamento de hoje</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{brl(r.hoje.faturamento)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Soma das {r.hoje.concluidos} venda(s) concluída(s) hoje
                  {registraVendas ? " — online, balcão, telefone e comandas." : " pelo cardápio online."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(r.visitas || pendentes.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {r.visitas && (
            <Card>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">Sua vitrine</CardTitle>
                  <p className="text-xs text-muted-foreground">Últimos 7 dias no guia</p>
                </div>
                <Link href="/comerciante/vitrine/visitas" className="text-sm font-medium text-primary hover:underline">
                  Ver detalhes
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold tabular-nums">{r.visitas.views}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {r.visitas.views === 1 ? "visita" : "visitas"} ao seu perfil
                    <Variacao atual={r.visitas.views} anterior={r.visitas.prevViews} />
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Contato icon={MessageCircle} label="Cliques no WhatsApp" valor={r.visitas.whatsapp} />
                  <Contato icon={Navigation} label="Pediram rota" valor={r.visitas.rotas} />
                </div>
              </CardContent>
            </Card>
          )}

          {pendentes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Complete seu perfil</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Perfis completos aparecem mais e recebem mais contatos — {passos.length - pendentes.length} de {passos.length} feitos.
                </p>
              </CardHeader>
              <CardContent className="space-y-1">
                {passos.map((p) =>
                  p.ok ? (
                    <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      <span className="line-through">{p.texto}</span>
                    </div>
                  ) : (
                    <Link key={p.id} href={p.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      <span className="flex-1">{p.texto}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ),
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {mostraPremium && (
        <Card className="bg-gradient-to-br from-amber-50 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-amber-600" /> Conheça o Premium
            </CardTitle>
            <p className="text-sm text-muted-foreground">Tudo o que o seu comércio precisa para vender mais, num lugar só.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="grid gap-2 sm:grid-cols-2">
              {BENEFICIOS_PREMIUM.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  {b}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Fale com a equipe do guia para liberar o Premium na sua loja.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Numero({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", destaque && "text-amber-600")}>{valor}</p>
    </div>
  )
}

function Contato({ icon: Icon, label, valor }: { icon: typeof MessageCircle; label: string; valor: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">{valor}</p>
    </div>
  )
}

// Comparação com os 7 dias anteriores.
function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior === 0) return null
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  if (pct === 0) return <span className="text-xs">· igual à semana anterior</span>
  const sobe = pct > 0
  const Icon = sobe ? TrendingUp : TrendingDown
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", sobe ? "text-green-600" : "text-rose-600")}>
      <Icon className="h-3 w-3" /> {sobe ? "+" : ""}
      {pct}% na semana
    </span>
  )
}
