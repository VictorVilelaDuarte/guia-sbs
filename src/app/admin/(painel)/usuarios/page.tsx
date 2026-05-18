import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UsuariosActions } from "@/components/admin/usuarios-actions"
import { CriarUsuarioDialog } from "@/components/admin/criar-usuario-dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

async function getUsuarios() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      comercio: { select: { nome: true } },
    },
  })
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  COMERCIANTE: "Comerciante",
}

const roleVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SUPER_ADMIN: "default",
  ADMIN: "secondary",
  COMERCIANTE: "outline",
}

export default async function UsuariosPage() {
  const [usuarios, session] = await Promise.all([getUsuarios(), auth()])
  const currentUserRole = session?.user?.role ?? "ADMIN"
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN"

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">{usuarios.length} cadastrados</p>
        </div>
        <CriarUsuarioDialog isSuperAdmin={isSuperAdmin} />
      </div>

      <div className="border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Comércio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            )}
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={roleVariants[u.role]}>
                    {roleLabels[u.role] ?? u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.comercio?.nome ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={u.active ? "default" : "destructive"}>
                    {u.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(u.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <UsuariosActions usuario={u} isSuperAdmin={isSuperAdmin} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
