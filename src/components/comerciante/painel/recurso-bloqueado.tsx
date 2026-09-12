import { Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// Tela de recurso fora do plano. Usada pelas páginas de gestão em vez de 404:
// o item continua no menu (com cadeado) e a página explica o que o recurso faz.
export function RecursoBloqueado({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="font-semibold">{titulo}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>
        <p className="text-xs text-muted-foreground">
          Disponível no plano Premium — fale com a equipe do guia para liberar.
        </p>
      </CardContent>
    </Card>
  )
}
