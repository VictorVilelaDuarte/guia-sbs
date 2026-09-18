"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BedDouble,
  BookOpen,
  LayoutGrid,
  Lock,
  Package,
  ReceiptText,
  Store,
  BarChart3,
  Briefcase,
  ChefHat,
  Contact,
  MonitorSmartphone,
  QrCode,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { temFeature, type FeatureKey } from "@/lib/plan-features"
import { temPermissao, type Permissao } from "@/lib/gestao/permissoes"
import { usePedidosAlerta } from "./pedidos-alerta"
import { AbrirPdvLink } from "@/components/comerciante/pdv/abrir-pdv"

// Navegação do painel: switch de área (Minha vitrine | Gestão) e itens da área
// Gestão — abas no desktop, barra inferior no mobile. A configuração vive no
// client porque ícones lucide não serializam de Server → Client Component.

interface ItemGestao {
  href: string
  label: string
  icon: LucideIcon
  feature?: FeatureKey
  categoria?: string
  // Aparece se o usuário tiver ALGUMA destas permissões (sem campo: todos).
  permissoes?: Permissao[]
  badgePedidos?: boolean
  // Fora da barra inferior do mobile (uso raro; cabem no máximo 5 itens).
  somenteDesktop?: boolean
  // Na barra inferior só para quem NÃO tem estas permissões (ex.: Produção vai
  // para a barra da cozinha, mas não empurra itens do dono para fora).
  mobileSemPermissoes?: Permissao[]
}

const ITENS_GESTAO: ItemGestao[] = [
  { href: "/comerciante/gestao", label: "Resumo", icon: LayoutGrid },
  {
    href: "/comerciante/gestao/pedidos",
    label: "Pedidos",
    icon: ReceiptText,
    feature: "pedido_online",
    permissoes: ["pedidos:operar"],
    badgePedidos: true,
  },
  {
    href: "/comerciante/gestao/producao",
    label: "Produção",
    icon: ChefHat,
    feature: "gestao_relatorios",
    permissoes: ["pedidos:operar"],
    mobileSemPermissoes: ["cardapio:editar", "vendas:registrar"],
  },
  {
    href: "/comerciante/gestao/cardapio",
    label: "Cardápio",
    icon: BookOpen,
    feature: "cardapio",
    permissoes: ["cardapio:editar", "itens:disponibilidade"],
  },
  {
    href: "/comerciante/gestao/produtos",
    label: "Produtos",
    icon: Package,
    permissoes: ["catalogo:editar", "itens:disponibilidade"],
    // No celular, Clientes ocupa a vaga; Produtos segue no atalho do Resumo.
    somenteDesktop: true,
  },
  {
    href: "/comerciante/gestao/vendas",
    label: "Vendas",
    icon: Receipt,
    feature: "gestao_relatorios",
    permissoes: ["vendas:registrar"],
    // No celular, o PDV abre pelo botão flutuante e a lista vem pelo Resumo.
    somenteDesktop: true,
  },
  {
    href: "/comerciante/gestao/mesas",
    label: "Mesas",
    icon: QrCode,
    feature: "gestao_relatorios",
    permissoes: ["pedidos:configurar"],
    somenteDesktop: true,
  },
  {
    href: "/comerciante/gestao/relatorios",
    label: "Relatórios",
    icon: BarChart3,
    feature: "gestao_relatorios",
    permissoes: ["vendas:ver"],
    // No celular, o caminho é o atalho do Resumo.
    somenteDesktop: true,
  },
  {
    href: "/comerciante/gestao/clientes",
    label: "Clientes",
    icon: Contact,
    feature: "gestao_clientes",
    permissoes: ["clientes:ver"],
  },
  {
    href: "/comerciante/gestao/acomodacoes",
    label: "Acomodações",
    icon: BedDouble,
    categoria: "HOSPEDAGEM",
    permissoes: ["quartos:editar"],
  },
  {
    href: "/comerciante/gestao/equipe",
    label: "Equipe",
    icon: Users,
    feature: "gestao_equipe",
    permissoes: ["equipe:gerenciar"],
    somenteDesktop: true,
  },
]

interface NavProps {
  features: unknown
  categorias: string[]
  permissoes: readonly Permissao[]
}

function itensVisiveis({ categorias, permissoes }: NavProps) {
  // Feature fora do plano: item continua visível com cadeado (o dono pode
  // contratar). Sem permissão do papel ou fora da categoria: item some (o
  // membro não tem o que fazer a respeito).
  return ITENS_GESTAO.filter(
    (i) =>
      (!i.categoria || categorias.includes(i.categoria)) &&
      (!i.permissoes || temPermissao(permissoes, ...i.permissoes)),
  )
}

function ativo(pathname: string, href: string) {
  return href === "/comerciante/gestao" ? pathname === href : pathname.startsWith(href)
}

function Badge({ n, className }: { n: number; className?: string }) {
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

export function AreaSwitch({ permissoes }: { permissoes: readonly Permissao[] }) {
  const pathname = usePathname()
  const alerta = usePedidosAlerta()
  const naGestao = pathname.startsWith("/comerciante/gestao")

  // Sem nada da vitrine (ex.: atendente, produção), o painel é só Gestão.
  if (!temPermissao(permissoes, "vitrine:editar", "analytics:ver")) return null

  const cls = (on: boolean) =>
    cn(
      "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    )

  return (
    <div className="flex rounded-lg bg-muted p-1">
      <Link href="/comerciante/vitrine" className={cls(!naGestao)}>
        <Store className="h-4 w-4" />
        Minha vitrine
      </Link>
      <Link href="/comerciante/gestao" className={cls(naGestao)}>
        <Briefcase className="h-4 w-4" />
        Gestão
        <Badge n={alerta?.aguardando ?? 0} />
      </Link>
    </div>
  )
}

export function GestaoTabs(props: NavProps) {
  const pathname = usePathname()
  const alerta = usePedidosAlerta()
  if (!pathname.startsWith("/comerciante/gestao")) return null

  return (
    <nav className="hidden md:flex border-b border-border overflow-x-auto scrollbar-none">
      {itensVisiveis(props).map((item) => {
        const on = ativo(pathname, item.href)
        const bloqueado = !!item.feature && !temFeature(props.features, item.feature)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5",
              on
                ? "border-primary text-primary"
                : bloqueado
                  ? "border-transparent text-muted-foreground/50"
                  : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {bloqueado && <Lock className="h-3 w-3" />}
            {item.badgePedidos && !bloqueado && <Badge n={alerta?.aguardando ?? 0} />}
          </Link>
        )
      })}
    </nav>
  )
}

export function GestaoBottomNav(props: NavProps) {
  const pathname = usePathname()
  const alerta = usePedidosAlerta()
  if (!pathname.startsWith("/comerciante/gestao")) return null

  return (
    <>
      {/* Espaçador: a barra é fixa e cobriria o fim do conteúdo. */}
      <div className="h-20 md:hidden" aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-3xl">
          {itensVisiveis(props)
            .filter((i) => !i.somenteDesktop && !(i.mobileSemPermissoes && temPermissao(props.permissoes, ...i.mobileSemPermissoes)))
            .map((item) => {
            const on = ativo(pathname, item.href)
            const bloqueado = !!item.feature && !temFeature(props.features, item.feature)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  on ? "text-primary" : "text-muted-foreground",
                  bloqueado && !on && "opacity-50",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badgePedidos && !bloqueado && (
                    <Badge
                      n={alerta?.aguardando ?? 0}
                      className="absolute -right-3 -top-2 h-4 min-w-4 text-[10px]"
                    />
                  )}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

// Botão flutuante do PDV no celular (decisão 2 da Fase 3): a barra inferior já
// tem 5 itens. Abre o PDV em aba própria. Só na Gestão, para quem vende com a flag.
export function AbrirPdvFab({ features, permissoes }: { features: unknown; permissoes: readonly Permissao[] }) {
  const pathname = usePathname()
  if (
    !pathname.startsWith("/comerciante/gestao") ||
    !temFeature(features, "gestao_relatorios") ||
    !temPermissao(permissoes, "vendas:registrar")
  ) {
    return null
  }
  return (
    <AbrirPdvLink
      aria-label="Abrir PDV"
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <MonitorSmartphone className="h-6 w-6" />
    </AbrirPdvLink>
  )
}

