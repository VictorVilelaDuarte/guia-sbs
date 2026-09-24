import { redirect } from "next/navigation"
import { getPainelBase } from "@/lib/painel/queries"
import { temPermissao } from "@/lib/gestao/permissoes"
import { rotaAbaVitrine } from "@/lib/painel/rotas"

// A vitrine virou páginas próprias (/comerciante/vitrine/perfil, /fotos…).
// Esta rota só redireciona: ?tab= de links salvos vai para a página
// equivalente; sem ele, para a primeira que o papel pode ver.
export default async function VitrinePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, base] = await Promise.all([searchParams, getPainelBase()])
  if (!base) return null
  const legada = rotaAbaVitrine(tab)
  if (legada) redirect(legada)
  redirect(temPermissao(base.permissoes, "vitrine:editar") ? "/comerciante/vitrine/perfil" : "/comerciante/vitrine/visitas")
}
