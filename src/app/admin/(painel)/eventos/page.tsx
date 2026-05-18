import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarDays } from "lucide-react"

async function getEventos() {
  return prisma.evento.findMany({
    orderBy: { dataInicio: "asc" },
    include: { comercio: { select: { nome: true } } },
  })
}

function isPast(date: Date) {
  return date < new Date()
}

export default async function EventosAdminPage() {
  const eventos = await getEventos()
  const proximos = eventos.filter((e) => !isPast(e.dataInicio))
  const passados = eventos.filter((e) => isPast(e.dataInicio))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-muted-foreground text-sm">
            {proximos.length} próximo{proximos.length !== 1 ? "s" : ""} · {passados.length} encerrado{passados.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Comércio</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Término</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Ingresso</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarDays className="h-8 w-8 opacity-30" />
                    Nenhum evento cadastrado.
                  </div>
                </TableCell>
              </TableRow>
            )}
            {eventos.map((e) => {
              const past = isPast(e.dataInicio)
              return (
                <TableRow key={e.id} className={past ? "opacity-60" : ""}>
                  <TableCell className="font-medium max-w-48 truncate">{e.titulo}</TableCell>
                  <TableCell className="text-muted-foreground">{e.comercio.nome}</TableCell>
                  <TableCell className="text-sm">
                    {format(e.dataInicio, "dd/MM/yyyy HH'h'mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.dataFim ? format(e.dataFim, "dd/MM/yyyy HH'h'mm", { locale: ptBR }) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-32 truncate">
                    {e.local ?? "—"}
                  </TableCell>
                  <TableCell>
                    {e.preco == null
                      ? <Badge variant="secondary">Gratuito</Badge>
                      : <span className="text-sm font-medium">
                          {e.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={past ? "outline" : "default"}>
                      {past ? "Encerrado" : "Próximo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
