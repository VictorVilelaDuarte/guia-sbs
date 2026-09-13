import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PedidosManager } from "@/components/comerciante/pedidos/pedidos-manager"
import { PedidoConfigForm } from "@/components/comerciante/pedidos/pedido-config-form"
import { ZonasEntregaManager } from "@/components/comerciante/pedidos/zonas-entrega-manager"
import { RecursoBloqueado } from "@/components/comerciante/painel/recurso-bloqueado"
import { getPainelBase, getPedidosData } from "@/lib/painel/queries"
import { notFound } from "next/navigation"
import { temFeature } from "@/lib/plan-features"
import { temPermissao } from "@/lib/gestao/permissoes"

export default async function GestaoPedidosPage() {
  const base = await getPainelBase()
  if (!base) return null
  if (!temPermissao(base.permissoes, "pedidos:operar")) notFound()
  const podeConfigurar = temPermissao(base.permissoes, "pedidos:configurar")

  if (!temFeature(base.comercio.plan.features, "pedido_online")) {
    return (
      <RecursoBloqueado
        titulo="Pedido online"
        descricao="Receba pedidos direto pelo seu cardápio, com entrega ou retirada, sem comissão de marketplace."
      />
    )
  }

  const { pedidosAdmin, pedidoConfig, zonasEntrega, bairrosCatalogo } = await getPedidosData(
    base.comercio.id,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos recebidos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Atualiza sozinho a cada poucos segundos. Com o painel aberto — em
            qualquer tela — você é avisado com som quando chega pedido novo.
          </p>
        </CardHeader>
        <CardContent>
          <PedidosManager pedidosIniciais={pedidosAdmin} />
        </CardContent>
      </Card>

      {/* Configuração da operação — só para quem pode configurar (dono, gerente). */}
      {podeConfigurar && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração de pedidos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Defina entrega, retirada, taxa e formas de pagamento. Ligue
                &ldquo;Aceitar pedidos&rdquo; para começar a receber.
              </p>
            </CardHeader>
            <CardContent>
              <PedidoConfigForm configInicial={pedidoConfig} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bairros de entrega</CardTitle>
              <p className="text-sm text-muted-foreground">
                Escolha os bairros que você atende e a taxa de cada um. A taxa
                do bairro escolhido pelo cliente é somada ao pedido.
              </p>
            </CardHeader>
            <CardContent>
              <ZonasEntregaManager catalogo={bairrosCatalogo} zonasIniciais={zonasEntrega} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
