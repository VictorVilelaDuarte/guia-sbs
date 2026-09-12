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
  Briefcase,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { temFeature, type FeatureKey } from "@/lib/plan-features"
import { usePedidosAlerta } from "./pedidos-alerta"

// Navegação do painel: switch de área (Minha vitrine | Gestão) e itens da área
// Gestão — abas no desktop, barra inferior no mobile. A configuração vive no
// client porque ícones lucide não serializam de Server → Client Component.

interface ItemGestao {
  href: string
  label: string
  icon: LucideIcon
  feature?: FeatureKey
  categoria?: string
  badgePedidos?: boolean
}

const ITENS_GESTAO: ItemGestao[] = [
  { href: "/comerciante/gestao", label: "Resumo", icon: LayoutGrid },
  {
    href: "/comerciante/gestao/pedidos",
    label: "Pedidos",
    icon: ReceiptText,
    feature: "pedido_online",
    badgePedidos: true,
  },
  { href: "/comerciante/gestao/cardapio", label: "Cardápio", icon: BookOpen, feature: "cardapio" },
  { href: "/comerciante/gestao/produtos", label: "Produtos", icon: Package },
  {
    href: "/comerciante/gestao/acomodacoes",
    label: "Acomodações",
    icon: BedDouble,
    categoria: "HOSPEDAGEM",
  },
]

interface NavProps {
  features: unknown
  categorias: string[]
}

function itensVisiveis({ categorias }: NavProps) {
  // Itens de feature bloqueada continuam visíveis (com cadeado) — a página
  // explica o recurso. Itens de categoria só aparecem para aquela categoria.
  return ITENS_GESTAO.filter((i) => !i.categoria || categorias.includes(i.categoria))
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

export function AreaSwitch() {
  const pathname = usePathname()
  const alerta = usePedidosAlerta()
  const naGestao = pathname.startsWith("/comerciante/gestao")

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
          {itensVisiveis(props).map((item) => {
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
