import { Clock } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { formatHorario, type HorarioDia } from "../_utils"

interface Props {
  horarios: HorarioDia[]
  diaAtual: string
}

export function SecaoHorarios({ horarios, diaAtual }: Props) {
  return (
    <>
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Horários de funcionamento
        </h2>
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {horarios.map((h) => {
            const isHoje = h.dia === diaAtual
            return (
              <div
                key={h.dia}
                className={`flex items-center justify-between px-3 py-2 text-sm ${
                  isHoje ? "bg-primary/5 font-semibold" : "bg-background"
                }`}
              >
                <span className={`flex items-center gap-2 ${!h.aberto ? "text-muted-foreground" : ""}`}>
                  {isHoje && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  {!isHoje && <span className="h-1.5 w-1.5 shrink-0" />}
                  {h.dia}
                </span>
                <span className={h.aberto ? "text-foreground" : "text-muted-foreground"}>
                  {formatHorario(h)}
                </span>
              </div>
            )
          })}
        </div>
      </section>
      <Separator className="mb-6" />
    </>
  )
}
