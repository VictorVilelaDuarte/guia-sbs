import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlanoDialog } from "@/components/admin/plano-dialog"
import { FEATURES_DISPONIVEIS, LIMITES_FREE, temFeature } from "@/lib/plan-features"
import { Check, X } from "lucide-react"

export default async function PlanosPage() {
  const [planos, session] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { ordem: "asc" },
      include: { _count: { select: { comercios: true } } },
    }),
    auth(),
  ])

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos de assinatura</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os recursos disponíveis em cada plano
          </p>
        </div>
        {isSuperAdmin && <PlanoDialog />}
      </div>

      {planos.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum plano cadastrado. Execute <code className="bg-muted px-1 rounded">npm run db:seed</code> para criar os planos padrão.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {planos.map((plano) => (
          <Card key={plano.id} className={!plano.ativo ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base">{plano.nome}</CardTitle>
                    {!plano.ativo && (
                      <Badge variant="outline" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {plano.slug}
                  </code>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold">
                    {plano.preco === 0
                      ? "Grátis"
                      : `R$ ${plano.preco.toFixed(2).replace(".", ",")}`}
                  </p>
                  {plano.preco > 0 && (
                    <p className="text-xs text-muted-foreground">por mês</p>
                  )}
                </div>
              </div>
              {plano.descricao && (
                <p className="text-sm text-muted-foreground mt-1">{plano.descricao}</p>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recursos
                </p>
                {FEATURES_DISPONIVEIS.map((feature) => {
                  const incluido = temFeature(plano.features, feature.key)
                  return (
                    <div key={feature.key} className="flex items-center gap-2 text-sm">
                      {incluido ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={incluido ? "" : "text-muted-foreground"}>
                        {feature.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Limites numéricos */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Limites
                </p>
                {(() => {
                  const ilimitado = temFeature(plano.features, "fotos_ilimitadas")
                  const limites = [
                    { label: "Fotos",           valor: ilimitado ? "Ilimitadas" : `Até ${LIMITES_FREE.fotos}` },
                    { label: "Produtos",         valor: ilimitado ? "Ilimitados" : `Até ${LIMITES_FREE.produtos}` },
                    { label: "Palavras-chave",   valor: ilimitado ? "Ilimitadas" : `Até ${LIMITES_FREE.tags}` },
                  ]
                  return limites.map(({ label, valor }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-medium ${ilimitado ? "text-green-600" : ""}`}>
                        {valor}
                      </span>
                    </div>
                  ))
                })()}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {plano._count.comercios}{" "}
                  {plano._count.comercios === 1 ? "comércio" : "comércios"}
                </p>
                {isSuperAdmin && <PlanoDialog plano={plano} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
