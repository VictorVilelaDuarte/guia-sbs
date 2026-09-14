import { Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Prévia da tela de clientes para plano sem `gestao_clientes`. Os NÚMEROS são
// reais (agregados); a lista borrada é FICTÍCIA de propósito: o blur é só CSS, e
// nomes/telefones reais estariam no HTML, visíveis pelo inspetor do navegador.
const LINHAS_FICTICIAS = [
  { nome: "Mariana Alves", detalhe: "8 pedidos · R$ 412,00 · último há 3 dias" },
  { nome: "Rafael Costa", detalhe: "5 pedidos · R$ 268,50 · último há 1 semana" },
  { nome: "Juliana Prado", detalhe: "3 pedidos · R$ 139,90 · último há 40 dias" },
  { nome: "Pedro Henrique", detalhe: "2 pedidos · R$ 96,00 · último ontem" },
]

function Numero({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
    </div>
  )
}

export function ClientesPrevia({
  numeros,
  temPedidoOnline,
}: {
  numeros: { total: number; novosMes: number; recorrentes: number; sumidos: number }
  temPedidoOnline: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clientes</CardTitle>
        <p className="text-sm text-muted-foreground">
          {numeros.total > 0
            ? "Seus clientes já estão aqui, vindos dos pedidos. Libere a tela completa para ver quem são."
            : temPedidoOnline
              ? "Seus clientes aparecem aqui a cada pedido recebido pelo cardápio."
              : "Seus clientes aparecem aqui quando você recebe pedidos pelo cardápio."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Numero label="Clientes" valor={numeros.total} />
          <Numero label="Novos no mês" valor={numeros.novosMes} />
          <Numero label="Voltaram a comprar" valor={numeros.recorrentes} />
          <Numero label="Sumidos há 30+ dias" valor={numeros.sumidos} />
        </div>

        <div className="relative">
          <div className="pointer-events-none select-none space-y-2 opacity-60 blur-[5px]" aria-hidden>
            {LINHAS_FICTICIAS.map((l) => (
              <div key={l.nome} className="rounded-lg border border-border bg-background p-3">
                <p className="font-medium">{l.nome}</p>
                <p className="text-xs">{l.detalhe}</p>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background shadow">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="max-w-xs text-sm font-medium">
              Veja quem compra com você, quanto cada um gasta, quem sumiu e quem faz aniversário.
            </p>
            <p className="text-xs text-muted-foreground">Disponível no plano Premium.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
