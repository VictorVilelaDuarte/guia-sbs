import type { AcaoDadosCliente } from "@prisma/client"
import { ShieldCheck } from "lucide-react"

// Lista dos acessos do admin do guia a dados de clientes (LGPD). Usada na tela
// de Clientes (para o dono) e na edição do comércio no admin.
const ACAO_LABEL: Record<AcaoDadosCliente, string> = {
  LISTA: "abriu a lista de clientes",
  DETALHE: "abriu um cliente",
  CADASTRO: "cadastrou um cliente",
  EDICAO: "editou um cliente",
  EXCLUSAO: "excluiu um cliente",
}

function quando(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function AcessosAdmin({
  acessos,
  descricao,
}: {
  acessos: { id: string; adminNome: string | null; acao: AcaoDadosCliente; createdAt: Date }[]
  descricao: string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <ShieldCheck className="h-4 w-4" /> Acessos da equipe do guia
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>
      {acessos.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nenhum acesso registrado.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs">
          {acessos.map((a) => (
            <li key={a.id}>
              <span className="tabular-nums text-muted-foreground">{quando(a.createdAt)}</span> ·{" "}
              {a.adminNome ?? "Administrador"} {ACAO_LABEL[a.acao]}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
