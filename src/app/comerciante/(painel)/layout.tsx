import Link from "next/link"
import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { getPainelBase } from "@/lib/painel/queries"
import { temFeature } from "@/lib/plan-features"
import { temPermissao } from "@/lib/gestao/permissoes"
import { PedidosAlertaProvider } from "@/components/comerciante/painel/pedidos-alerta"
import { SeletorLoja } from "@/components/comerciante/painel/seletor-loja"
import {
  AreaSwitch,
  GestaoBottomNav,
  GestaoTabs,
  AbrirPdvFab,
} from "@/components/comerciante/painel/painel-nav"
import { ChevronLeft, KeyRound, LogOut, MapPin, ShieldCheck, Store } from "lucide-react"

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ATIVO: "default",
  PENDENTE: "secondary",
  INATIVO: "outline",
  REJEITADO: "destructive",
}

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  PENDENTE: "Aguardando aprovação",
  INATIVO: "Inativo",
  REJEITADO: "Rejeitado",
}

// Shell do painel do comércio — áreas "Minha vitrine" (Guia) e "Gestão".
// Serve o comerciante e o admin gerenciando qualquer comércio: ambos resolvidos
// por getComercioCtx() (via getPainelBase), o mesmo helper das rotas de API.
export default async function ComercianteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/admin/login")

  const role = session.user.role
  const isAdminRole = role === "ADMIN" || role === "SUPER_ADMIN"
  if (!isAdminRole && role !== "COMERCIANTE") redirect("/")

  // Senha temporária (criada pela tela de equipe): troca obrigatória antes de
  // qualquer tela do painel. Lido do banco a cada request, não do JWT — senão só
  // valeria quando o token expirasse. As APIs também bloqueiam (getComercioCtx).
  if (role === "COMERCIANTE") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { trocarSenha: true },
    })
    if (user?.trocarSenha) redirect("/comerciante/trocar-senha")
  }

  const base = await getPainelBase()
  // Admin só entra com um comércio-alvo válido no cookie (o middleware checa só
  // a presença do cookie; aqui confere que o comércio existe).
  if (!base && isAdminRole) redirect("/admin/comercios")

  const comercio = base?.comercio
  const isAdmin = base?.ctx.isAdmin ?? false
  const permissoes = base?.permissoes ?? []

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="font-semibold">Guia SBS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">{session.user.name}</span>
            {isAdmin && comercio ? (
              // Admin não ganha "Sair" aqui: deslogaria a sessão de admin.
              <Link
                href={`/admin/comercios/${comercio.id}`}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar ao admin
              </Link>
            ) : (
              <>
                <Link
                  href="/comerciante/trocar-senha"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                  title="Alterar senha"
                >
                  <KeyRound className="h-4 w-4" />
                  <span className="hidden sm:inline">Alterar senha</span>
                </Link>
                <form
                  action={async () => {
                    "use server"
                    await signOut({ redirectTo: "/admin/login" })
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm">
                    <LogOut className="h-4 w-4 mr-1" />
                    Sair
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {!comercio ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Store className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Nenhum comércio vinculado</p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com o administrador para vincular seu comércio.
              </p>
            </CardContent>
          </Card>
        ) : (
          <PedidosAlertaProvider
            // key por comércio: ao trocar de loja o provider remonta e refaz a linha
            // de base — senão os pedidos já existentes na loja nova tocariam como "novos".
            key={comercio.id}
            ativo={
              temFeature(comercio.plan.features, "pedido_online") &&
              temPermissao(permissoes, "pedidos:operar")
            }
          >
            <div className="space-y-6">
              {isAdmin && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Você está gerenciando este comércio como administrador — tudo que
                    salvar aqui vale como se fosse o próprio comerciante. Evite gerenciar
                    dois comércios em abas abertas ao mesmo tempo.
                  </p>
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <SeletorLoja lojas={base?.lojas ?? []} atualId={comercio.id} nomeAtual={comercio.nome} />
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {isAdmin ? "Painel completo do comércio" : "Gerencie seu comércio"}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end items-center gap-2 shrink-0">
                  <Badge variant={statusVariants[comercio.status]}>
                    {statusLabels[comercio.status] ?? comercio.status}
                  </Badge>
                  <Badge variant={comercio.plan.slug === "premium" ? "default" : "outline"}>
                    {comercio.plan.nome}
                  </Badge>
                </div>
              </div>

              <AreaSwitch permissoes={permissoes} />
              <GestaoTabs
                features={comercio.plan.features}
                categorias={comercio.categorias}
                permissoes={permissoes}
              />

              <div>{children}</div>
            </div>
            <GestaoBottomNav
              features={comercio.plan.features}
              categorias={comercio.categorias}
              permissoes={permissoes}
            />
            <AbrirPdvFab features={comercio.plan.features} permissoes={permissoes} />
          </PedidosAlertaProvider>
        )}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
