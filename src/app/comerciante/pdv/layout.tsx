import Link from "next/link"
import { redirect } from "next/navigation"
import { Lock } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Toaster } from "@/components/ui/sonner"
import { getPainelBase } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"

// PDV em tela cheia (Fase 3 do docs/modulo-gestao.md): fora do shell do painel
// — sem cabeçalho, abas nem barra inferior — e aberto em aba própria. Mesmas
// regras de acesso do painel (getComercioCtx via getPainelBase).
export const metadata = { title: "PDV" }

export default async function PdvLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/admin/login")
  const role = session.user.role
  const isAdminRole = role === "ADMIN" || role === "SUPER_ADMIN"
  if (!isAdminRole && role !== "COMERCIANTE") redirect("/")
  if (role === "COMERCIANTE") {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { trocarSenha: true } })
    if (!user) redirect("/api/sessao/encerrar") // conta apagada com sessão ainda válida
    if (user.trocarSenha) redirect("/comerciante/trocar-senha")
  }

  const base = await getPainelBase()
  if (!base) redirect(isAdminRole ? "/admin/comercios" : "/comerciante")

  const semAcesso = !temPermissao(base.permissoes, "vendas:registrar")
  const semPlano = !temFeature(base.comercio.plan.features, "gestao_relatorios")

  return (
    <div className="min-h-dvh bg-stone-100 text-stone-900">
      {semAcesso || semPlano ? (
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div className="max-w-sm space-y-3 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
              <Lock className="h-5 w-5 text-stone-600" />
            </div>
            <p className="font-semibold">{semAcesso ? "Sem acesso ao PDV" : "PDV fora do plano"}</p>
            <p className="text-sm text-stone-600">
              {semAcesso
                ? "Seu papel neste comércio não registra vendas."
                : "O PDV (vendas de balcão, telefone e comandas) está disponível no plano Premium — fale com a equipe do guia para liberar."}
            </p>
            <Link href="/comerciante" className="inline-block text-sm font-medium underline">Voltar ao painel</Link>
          </div>
        </div>
      ) : (
        children
      )}
      <Toaster richColors position="top-center" />
    </div>
  )
}
