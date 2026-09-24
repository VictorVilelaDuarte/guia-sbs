"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  ChevronDown,
  BedDouble,
  BookOpen,
  CalendarDays,
  ChefHat,
  Contact,
  ExternalLink,
  Home,
  Image as ImageIcon,
  LineChart,
  Lock,
  Menu,
  MonitorSmartphone,
  Package,
  QrCode,
  Receipt,
  ReceiptText,
  Sparkles,
  Store,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { temFeature, type FeatureKey } from "@/lib/plan-features"
import { temPermissao, type Permissao } from "@/lib/gestao/permissoes"
import { usePedidosAlerta } from "./pedidos-alerta"
import { AbrirPdvLink } from "@/components/comerciante/pdv/abrir-pdv"

// Navegação do painel do comércio: um menu só, agrupado por assunto — sidebar no
// desktop, barra inferior (4 atalhos + "Mais") no celular. Os três leem a mesma
// lista abaixo; a configuração vive no client porque ícones lucide não serializam
// de Server → Client Component.
//
// Regras de exibição (iguais para todos os lugares):
// - `feature` fora do plano → item vai para o grupo recolhido "Recursos Premium",
//   com cadeado (o dono pode contratar; espalhados, lotavam o menu do Gratuito);
// - sem permissão do papel ou fora da `categoria` → item some;
// - grupo sem itens visíveis some inteiro.

type Destino =
  | { tipo: "rota"; href: string } // rota do painel
  | { tipo: "pdv" } // abre o PDV em aba própria
  | { tipo: "publica" } // vitrine pública, nova aba

interface ItemMenu {
  id: string
  label: string
  icon: LucideIcon
  destino: Destino
  feature?: FeatureKey
  categoria?: string
  // Aparece se o usuário tiver ALGUMA destas permissões (sem campo: todos).
  permissoes?: Permissao[]
  badgePedidos?: boolean
}

interface GrupoMenu {
  titulo: string | null
  itens: ItemMenu[]
}

const GRUPOS: GrupoMenu[] = [
  {
    titulo: null,
    itens: [{ id: "inicio", label: "Início", icon: Home, destino: { tipo: "rota", href: "/comerciante" } }],
  },
  {
    titulo: "Operação",
    itens: [
      {
        id: "pedidos",
        label: "Pedidos",
        icon: ReceiptText,
        destino: { tipo: "rota", href: "/comerciante/gestao/pedidos" },
        feature: "pedido_online",
        permissoes: ["pedidos:operar"],
        badgePedidos: true,
      },
      {
        id: "pdv",
        label: "PDV",
        icon: MonitorSmartphone,
        destino: { tipo: "pdv" },
        feature: "gestao_relatorios",
        permissoes: ["vendas:registrar"],
      },
      {
        id: "producao",
        label: "Produção",
        icon: ChefHat,
        destino: { tipo: "rota", href: "/comerciante/gestao/producao" },
        feature: "gestao_relatorios",
        permissoes: ["pedidos:operar"],
      },
      {
        id: "vendas",
        label: "Vendas",
        icon: Receipt,
        destino: { tipo: "rota", href: "/comerciante/gestao/vendas" },
        feature: "gestao_relatorios",
        permissoes: ["vendas:registrar"],
      },
      {
        id: "mesas",
        label: "Mesas",
        icon: QrCode,
        destino: { tipo: "rota", href: "/comerciante/gestao/mesas" },
        feature: "gestao_relatorios",
        permissoes: ["pedidos:configurar"],
      },
    ],
  },
  {
    titulo: "Cardápio e produtos",
    itens: [
      {
        id: "cardapio",
        label: "Cardápio",
        icon: BookOpen,
        destino: { tipo: "rota", href: "/comerciante/gestao/cardapio" },
        feature: "cardapio",
        permissoes: ["cardapio:editar", "itens:disponibilidade"],
      },
      {
        id: "produtos",
        label: "Produtos e serviços",
        icon: Package,
        destino: { tipo: "rota", href: "/comerciante/gestao/produtos" },
        permissoes: ["catalogo:editar", "itens:disponibilidade"],
      },
      {
        id: "acomodacoes",
        label: "Acomodações",
        icon: BedDouble,
        destino: { tipo: "rota", href: "/comerciante/gestao/acomodacoes" },
        categoria: "HOSPEDAGEM",
        permissoes: ["quartos:editar"],
      },
    ],
  },
  {
    titulo: "Clientes e equipe",
    itens: [
      {
        id: "clientes",
        label: "Clientes",
        icon: Contact,
        destino: { tipo: "rota", href: "/comerciante/gestao/clientes" },
        feature: "gestao_clientes",
        permissoes: ["clientes:ver"],
      },
      {
        id: "equipe",
        label: "Equipe",
        icon: Users,
        destino: { tipo: "rota", href: "/comerciante/gestao/equipe" },
        feature: "gestao_equipe",
        permissoes: ["equipe:gerenciar"],
      },
    ],
  },
  {
    titulo: "Resultados",
    itens: [
      {
        id: "relatorios",
        label: "Relatórios",
        icon: BarChart3,
        destino: { tipo: "rota", href: "/comerciante/gestao/relatorios" },
        feature: "gestao_relatorios",
        permissoes: ["vendas:ver"],
      },
      // Sem `feature`: abre para todos — o plano Gratuito vê as visitas e o teaser.
      {
        id: "analytics",
        label: "Visitas da vitrine",
        icon: LineChart,
        destino: { tipo: "rota", href: "/comerciante/vitrine/visitas" },
        permissoes: ["analytics:ver"],
      },
    ],
  },
  {
    titulo: "Minha vitrine",
    itens: [
      {
        id: "perfil",
        label: "Perfil",
        icon: Store,
        destino: { tipo: "rota", href: "/comerciante/vitrine/perfil" },
        permissoes: ["vitrine:editar"],
      },
      {
        id: "fotos",
        label: "Fotos",
        icon: ImageIcon,
        destino: { tipo: "rota", href: "/comerciante/vitrine/fotos" },
        permissoes: ["vitrine:editar"],
      },
      {
        id: "comodidades",
        label: "Comodidades e políticas",
        icon: Sparkles,
        destino: { tipo: "rota", href: "/comerciante/vitrine/comodidades" },
        categoria: "HOSPEDAGEM",
        permissoes: ["vitrine:editar"],
      },
      {
        id: "eventos",
        label: "Eventos",
        icon: CalendarDays,
        destino: { tipo: "rota", href: "/comerciante/vitrine/eventos" },
        feature: "eventos",
        permissoes: ["vitrine:editar"],
      },
      {
        id: "tags",
        label: "Palavras-chave",
        icon: Tags,
        destino: { tipo: "rota", href: "/comerciante/vitrine/palavras-chave" },
        permissoes: ["vitrine:editar"],
      },
      {
        id: "publica",
        label: "Ver vitrine pública",
        icon: ExternalLink,
        destino: { tipo: "publica" },
        permissoes: ["vitrine:editar", "analytics:ver"],
      },
    ],
  },
]

// Atalhos da barra inferior do celular, por prioridade: entram os 4 primeiros que
// o usuário vê e que o plano libera (cadeado não ocupa vaga). O resto fica no "Mais".
const PRIORIDADE_MOBILE = ["inicio", "pedidos", "producao", "cardapio", "clientes", "acomodacoes", "produtos", "perfil", "fotos"]
// Produção só vira atalho para quem não vende nem edita o cardápio (a cozinha):
// para o dono ela empurraria Cardápio/Clientes para o "Mais".
const PRODUCAO_SO_PARA_COZINHA: Permissao[] = ["cardapio:editar", "vendas:registrar"]

export interface NavProps {
  features: unknown
  categorias: string[]
  permissoes: readonly Permissao[]
  slug: string
}

function visivel(item: ItemMenu, { categorias, permissoes }: NavProps) {
  return (!item.categoria || categorias.includes(item.categoria)) && (!item.permissoes || temPermissao(permissoes, ...item.permissoes))
}

function gruposVisiveis(props: NavProps) {
  return GRUPOS.map((g) => ({ ...g, itens: g.itens.filter((i) => visivel(i, props)) })).filter((g) => g.itens.length > 0)
}

const bloqueado = (item: ItemMenu, features: unknown) => !!item.feature && !temFeature(features, item.feature)

function useItemAtivo(): string | null {
  const pathname = usePathname()
  let melhor: ItemMenu | null = null
  for (const i of GRUPOS.flatMap((g) => g.itens)) {
    if (i.destino.tipo !== "rota") continue
    const href = i.destino.href
    // Início (/comerciante) é prefixo de tudo: só acende na própria página.
    const casa = href === "/comerciante" ? pathname === href : pathname === href || pathname.startsWith(href + "/")
    if (casa && (!melhor || href.length > (melhor.destino as { href: string }).href.length)) melhor = i
  }
  return melhor?.id ?? null
}

function Contador({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null
  return (
    <span
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white",
        className,
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  )
}

// Link de um item, qualquer que seja o destino. `children` = conteúdo visual.
function LinkItem({
  item,
  slug,
  className,
  onNavegar,
  children,
}: {
  item: ItemMenu
  slug: string
  className: string
  onNavegar?: () => void
  children: React.ReactNode
}) {
  const d = item.destino
  if (d.tipo === "pdv") {
    return (
      <AbrirPdvLink className={className}>
        {children}
      </AbrirPdvLink>
    )
  }
  if (d.tipo === "publica") {
    return (
      <a href={`/vitrine/${slug}`} target="_blank" rel="noopener noreferrer" className={className} onClick={onNavegar}>
        {children}
      </a>
    )
  }
  return (
    <Link href={d.href} className={className} onClick={onNavegar}>
      {children}
    </Link>
  )
}

// Lista agrupada — usada pela sidebar e pelo "Mais" do celular.
function MenuAgrupado({ props, onNavegar }: { props: NavProps; onNavegar?: () => void }) {
  const ativo = useItemAtivo()
  const grupos = gruposVisiveis(props)
  const livres = grupos
    .map((g) => ({ ...g, itens: g.itens.filter((i) => !bloqueado(i, props.features)) }))
    .filter((g) => g.itens.length > 0)
  const premium = grupos.flatMap((g) => g.itens).filter((i) => bloqueado(i, props.features))
  // Aberto de saída quando a tela atual é um recurso bloqueado — senão o item
  // ativo ficaria escondido dentro do grupo fechado.
  const [premiumAberto, setPremiumAberto] = useState(() => premium.some((i) => i.id === ativo))

  return (
    <nav className="space-y-5">
      {livres.map((g) => (
        <div key={g.titulo ?? "_"}>
          {g.titulo && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {g.titulo}
            </p>
          )}
          <ul className="space-y-0.5">
            {g.itens.map((item) => (
              <li key={item.id}>
                <ItemLinha item={item} props={props} on={ativo === item.id} onNavegar={onNavegar} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {premium.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setPremiumAberto((a) => !a)}
            aria-expanded={premiumAberto}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 hover:bg-muted"
          >
            <Lock className="h-3 w-3" />
            <span className="flex-1 text-left">Recursos Premium ({premium.length})</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", premiumAberto && "rotate-180")} />
          </button>
          {premiumAberto && (
            <ul className="mt-1 space-y-0.5">
              {premium.map((item) => (
                <li key={item.id}>
                  <ItemLinha item={item} props={props} on={ativo === item.id} onNavegar={onNavegar} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </nav>
  )
}

function ItemLinha({
  item,
  props,
  on,
  onNavegar,
}: {
  item: ItemMenu
  props: NavProps
  on: boolean
  onNavegar?: () => void
}) {
  const alerta = usePedidosAlerta()
  const lock = bloqueado(item, props.features)
  const externo = item.destino.tipo === "pdv" || item.destino.tipo === "publica"
  const Icon = item.icon
  return (
    <LinkItem
      item={item}
      slug={props.slug}
      onNavegar={onNavegar}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        on ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground",
        lock && !on && "text-muted-foreground/70",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {lock && <Lock className="h-3.5 w-3.5 shrink-0" />}
      {!lock && externo && <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />}
      {!lock && item.badgePedidos && <Contador n={alerta?.aguardando ?? 0} />}
    </LinkItem>
  )
}

// Sidebar do desktop. `topo` (nome da loja, plano) e `rodape` (conta, sair) vêm
// prontos do layout — o "Sair" é server action.
export function PainelSidebar({ nav, topo, rodape }: { nav: NavProps; topo: React.ReactNode; rodape: React.ReactNode }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background md:flex print:hidden">
      <div className="border-b px-4 py-4">{topo}</div>
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <MenuAgrupado props={nav} />
      </div>
      <div className="border-t px-4 py-3">{rodape}</div>
    </aside>
  )
}

// Título da tela atual no topo do conteúdo — sem abas, é o que diz onde se está.
export function PainelTitulo() {
  const ativo = useItemAtivo()
  const item = GRUPOS.flatMap((g) => g.itens).find((i) => i.id === ativo)
  if (!item) return null
  return <h1 className="text-xl font-semibold tracking-tight md:text-2xl print:hidden">{item.label}</h1>
}

// Barra inferior do celular: 4 atalhos + "Mais" (menu completo numa folha de baixo).
export function PainelBottomNav({ nav, topo, rodape }: { nav: NavProps; topo: React.ReactNode; rodape: React.ReactNode }) {
  const ativo = useItemAtivo()
  const alerta = usePedidosAlerta()
  const pathname = usePathname()
  // Guarda em qual endereço o "Mais" foi aberto: navegou (inclusive pelo botão
  // voltar), o endereço muda e a folha fecha sozinha.
  const [abertoEm, setAbertoEm] = useState<string | null>(null)
  const aberto = abertoEm === pathname

  const todos = gruposVisiveis(nav).flatMap((g) => g.itens)
  const atalhos = PRIORIDADE_MOBILE.map((id) => todos.find((i) => i.id === id))
    .filter((i): i is ItemMenu => !!i && !bloqueado(i, nav.features))
    .filter((i) => i.id !== "producao" || !temPermissao(nav.permissoes, ...PRODUCAO_SO_PARA_COZINHA))
    .slice(0, 4)
  // Item ativo que não é atalho: o "Mais" fica aceso para indicar onde se está.
  const maisAtivo = !!ativo && !atalhos.some((i) => i.id === ativo)

  return (
    <>
      {/* Espaçador: a barra é fixa e cobriria o fim do conteúdo. */}
      <div className="h-20 md:hidden print:hidden" aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {atalhos.map((item) => {
            const Icon = item.icon
            const on = ativo === item.id
            return (
              <LinkItem
                key={item.id}
                item={item}
                slug={nav.slug}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  on ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badgePedidos && (
                    <Contador n={alerta?.aguardando ?? 0} className="absolute -right-3 -top-2 h-4 min-w-4 text-[10px]" />
                  )}
                </span>
                <span className="max-w-full truncate px-1">{item.label.split(" ")[0]}</span>
              </LinkItem>
            )
          })}
          <button
            type="button"
            onClick={() => setAbertoEm(pathname)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              maisAtivo ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Menu className="h-5 w-5" />
            Mais
          </button>
        </div>
      </nav>
      {aberto && <FolhaMais nav={nav} topo={topo} rodape={rodape} onFechar={() => setAbertoEm(null)} />}
    </>
  )
}

function FolhaMais({
  nav,
  topo,
  rodape,
  onFechar,
}: {
  nav: NavProps
  topo: React.ReactNode
  rodape: React.ReactNode
  onFechar: () => void
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar()
    window.addEventListener("keydown", esc)
    // Trava a rolagem da página por baixo da folha.
    const antes = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", esc)
      document.body.style.overflow = antes
    }
  }, [onFechar])

  return createPortal(
    // Wrapper fixo único + filhos absolutos: position:fixed dentro de flex quebra
    // no Safari iOS (ver "Bottom sheet de produto" no CLAUDE.md).
    <div className="md:hidden" style={{ position: "fixed", inset: 0, zIndex: 50 }} role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-background"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0 flex-1">{topo}</div>
          <button type="button" onClick={onFechar} aria-label="Fechar menu" className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <MenuAgrupado props={nav} onNavegar={onFechar} />
        </div>
        <div className="border-t px-4 py-3">{rodape}</div>
      </div>
    </div>,
    document.getElementById("portal-root") ?? document.body,
  )
}

// Botão flutuante do PDV no celular: quem vende abre o PDV de qualquer tela sem
// passar pelo "Mais". Abre em aba própria.
export function AbrirPdvFab({ features, permissoes }: { features: unknown; permissoes: readonly Permissao[] }) {
  if (!temFeature(features, "gestao_relatorios") || !temPermissao(permissoes, "vendas:registrar")) return null
  return (
    <AbrirPdvLink
      aria-label="Abrir PDV"
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden print:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <MonitorSmartphone className="h-6 w-6" />
    </AbrirPdvLink>
  )
}
