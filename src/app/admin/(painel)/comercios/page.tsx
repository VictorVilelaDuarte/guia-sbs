import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ComerciosActions } from "@/components/admin/comercios-actions"
import { CriarComercioDialog } from "@/components/admin/criar-comercio-dialog"
import { ComerciosFiltros } from "@/components/admin/comercios-filtros"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Suspense } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { ComercioStatus, Categoria } from "@prisma/client"

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ATIVO: "default",
  PENDENTE: "secondary",
  INATIVO: "outline",
  REJEITADO: "destructive",
}

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  PENDENTE: "Pendente",
  INATIVO: "Inativo",
  REJEITADO: "Rejeitado",
}

const categoriaLabels: Record<string, string> = {
  RESTAURANTE: "Restaurante",
  HOSPEDAGEM: "Hospedagem",
  TURISMO: "Turismo",
  SERVICO: "Serviço",
  COMERCIO: "Comércio",
  ENTRETENIMENTO: "Entretenimento",
}

const statusValidos: ComercioStatus[] = ["PENDENTE", "ATIVO", "INATIVO", "REJEITADO"]
const categoriaValidas: Categoria[] = ["RESTAURANTE", "HOSPEDAGEM", "TURISMO", "SERVICO", "COMERCIO", "ENTRETENIMENTO"]

export default async function ComerciosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; categoria?: string }>
}) {
  const { q, status, categoria } = await searchParams

  const comercios = await prisma.comercio.findMany({
    where: {
      ...(q ? { nome: { contains: q, mode: "insensitive" } } : {}),
      ...(status && statusValidos.includes(status as ComercioStatus)
        ? { status: status as ComercioStatus }
        : {}),
      ...(categoria && categoriaValidas.includes(categoria as Categoria)
        ? { categoria: categoria as Categoria }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { name: true, email: true } },
      plan: { select: { slug: true, nome: true } },
    },
  })

  const temFiltro = q || (status && status !== "todos") || (categoria && categoria !== "todas")

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comércios</h1>
          <p className="text-muted-foreground text-sm">
            {temFiltro
              ? `${comercios.length} encontrado${comercios.length !== 1 ? "s" : ""}`
              : `${comercios.length} cadastrado${comercios.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <CriarComercioDialog />
      </div>

      <Suspense>
        <ComerciosFiltros />
      </Suspense>

      <div className="border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {comercios.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  {temFiltro ? "Nenhum comércio encontrado para os filtros aplicados." : "Nenhum comércio cadastrado."}
                </TableCell>
              </TableRow>
            )}
            {comercios.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/vitrine/${c.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-primary transition-colors group"
                  >
                    {c.nome}
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {categoriaLabels[c.categoria] ?? c.categoria}
                </TableCell>
                <TableCell>
                  <Badge variant={c.plan.slug === "premium" ? "default" : "outline"}>
                    {c.plan.nome}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[c.status]}>
                    {statusLabels[c.status] ?? c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {c.owner.name}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(c.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <ComerciosActions comercio={{ id: c.id, nome: c.nome, status: c.status, plan: c.plan }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
