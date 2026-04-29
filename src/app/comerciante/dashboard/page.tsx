import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditarComercioForm } from "@/components/comerciante/editar-comercio-form"
import { LogoUploader } from "@/components/comerciante/logo-uploader"
import { FotosUploader } from "@/components/comerciante/fotos-uploader"
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
    include: { fotos: { orderBy: { ordem: "asc" } } },
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

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
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
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{comercio.nome}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Gerencie as informações do seu comércio</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariants[comercio.status]}>
                  {statusLabels[comercio.status] ?? comercio.status}
                </Badge>
                <Badge variant={comercio.plano === "PREMIUM" ? "default" : "outline"}>
                  {comercio.plano}
                </Badge>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logo</CardTitle>
              </CardHeader>
              <CardContent>
                <LogoUploader logoAtual={comercio.logo} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fotos do comércio</CardTitle>
              </CardHeader>
              <CardContent>
                <FotosUploader fotosIniciais={comercio.fotos} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent>
                <EditarComercioForm comercio={comercio} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
