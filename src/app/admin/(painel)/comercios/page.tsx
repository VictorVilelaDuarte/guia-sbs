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
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

async function getComercios() {
  return prisma.comercio.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true, email: true } } },
  })
}

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

export default async function ComerciosPage() {
  const comercios = await getComercios()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comércios</h1>
          <p className="text-muted-foreground text-sm">{comercios.length} cadastrados</p>
        </div>
        <CriarComercioDialog />
      </div>

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
                  Nenhum comércio cadastrado.
                </TableCell>
              </TableRow>
            )}
            {comercios.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-muted-foreground">
                  {categoriaLabels[c.categoria] ?? c.categoria}
                </TableCell>
                <TableCell>
                  <Badge variant={c.plano === "PREMIUM" ? "default" : "outline"}>
                    {c.plano}
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
                  <ComerciosActions comercio={c} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
