import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EquipeManager } from "@/components/comerciante/equipe/equipe-manager"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { getPainelBase } from "@/lib/painel/queries"
import { listarEquipe } from "@/lib/gestao/equipe"
import { temPermissao } from "@/lib/gestao/permissoes"
import { temFeature } from "@/lib/plan-features"

export default async function GestaoEquipePage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "equipe:gerenciar")) notFound()

  if (!temFeature(base.comercio.plan.features, "gestao_equipe")) {
    return (
      <RecursoBloqueado
        titulo="Equipe"
        descricao="Dê acesso ao painel para gerente, atendentes e produção, cada um vendo só o que precisa."
      />
    )
  }

  const equipe = await listarEquipe(base.comercio.id, base.ctx.userId)

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Quem tem acesso ao painel deste comércio e o que cada pessoa pode fazer. Mudanças valem na
          hora — não é preciso a pessoa sair e entrar de novo.
        </p>
      </CardHeader>
      <CardContent>
        <EquipeManager equipeInicial={equipe} />
      </CardContent>
    </Card>
  )
}
