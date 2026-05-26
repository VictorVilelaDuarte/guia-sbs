import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EditarComercioForm } from "@/components/comerciante/editar-comercio-form"
import { LogoUploader } from "@/components/comerciante/logo-uploader"

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ATIVO: "default",
  PENDENTE: "secondary",
  INATIVO: "outline",
  REJEITADO: "destructive",
}

export default async function EditarComercioAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [comercio, subcategoriasDisponiveis] = await Promise.all([
    prisma.comercio.findUnique({
      where: { id },
      include: {
        plan: { select: { nome: true } },
        subcategorias: { select: { id: true, nome: true, categoria: true } },
      },
    }),
    prisma.subcategoria.findMany({
      where: { ativo: true },
      orderBy: [{ categoria: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, categoria: true },
    }),
  ])

  if (!comercio) notFound()

  const saveUrl = `/api/admin/comercios/${comercio.id}`

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Link
          href="/admin/comercios"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Comércios
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{comercio.nome}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Editando como administrador
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariants[comercio.status]}>
              {comercio.status}
            </Badge>
            <Badge variant="outline">{comercio.plan.nome}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <LogoUploader
            logoAtual={comercio.logo}
            comercioId={comercio.id}
            saveUrl={saveUrl}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <EditarComercioForm
            comercio={comercio}
            subcategoriasDisponiveis={subcategoriasDisponiveis}
            saveUrl={saveUrl}
            adminMode
          />
        </CardContent>
      </Card>
    </div>
  )
}
