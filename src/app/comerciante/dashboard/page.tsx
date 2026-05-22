import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardTabs } from "@/components/comerciante/dashboard-tabs"
import { LogOut, MapPin, Store } from "lucide-react"

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

export default async function ComercinateDashboard() {
  const session = await auth()
  if (!session) redirect("/admin/login")

  const comercio = await prisma.comercio.findUnique({
    where: { ownerId: session.user.id },
    include: {
      plan:     true,
      fotos:    { orderBy: { ordem: "asc" } },
      tags:     { orderBy: { createdAt: "asc" }, select: { id: true, nome: true } },
      produtos: { orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] },
      eventos:  { orderBy: { dataInicio: "asc" } },
      cardapioCategorias: {
        orderBy: { ordem: "asc" },
        include: {
          itens: {
            orderBy: { ordem: "asc" },
            include: { variacoes: { orderBy: { ordem: "asc" } } },
          },
        },
      },
    },
  })

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
            <span className="text-sm text-muted-foreground">{session.user.name}</span>
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
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{comercio.nome}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gerencie as informações do seu comércio
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={statusVariants[comercio.status]}>
                  {statusLabels[comercio.status] ?? comercio.status}
                </Badge>
                <Badge variant={comercio.plan.slug === "premium" ? "default" : "outline"}>
                  {comercio.plan.nome}
                </Badge>
              </div>
            </div>

            <DashboardTabs comercio={comercio} />
          </div>
        )}
      </main>
    </div>
  )
}
