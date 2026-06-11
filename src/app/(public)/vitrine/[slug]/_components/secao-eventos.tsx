import Image from "next/image"
import { Calendar, MapPin, Ticket, ExternalLink } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { isPast, isToday } from "date-fns"
import { TrackImpression } from "@/components/public/analytics/track-impression"
import { formatDataEvento, formatPreco } from "../_utils"

interface Evento {
  id: string
  titulo: string
  dataInicio: Date
  dataFim: Date | null
  imagem: string | null
  local: string | null
  descricao: string | null
  preco: number | null
  linkExterno: string | null
}

interface Props {
  eventos: Evento[]
  // presente apenas quando o comércio está publicado — liga a impressão
  // (evento_view) de cada card via IntersectionObserver
  trackComercioId?: string
}

export function SecaoEventos({ eventos, trackComercioId }: Props) {
  const agora = new Date()
  const ativos = eventos.filter((e) => !e.dataFim || e.dataFim >= agora)
  const passados = eventos.filter((e) => e.dataFim && e.dataFim < agora)
  const ordenados = [...ativos, ...passados.reverse()]

  return (
    <>
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Eventos
        </h2>
        <div className="space-y-3">
          {ordenados.map((evento) => {
            const encerrado = !!evento.dataFim && isPast(evento.dataFim)
            const hoje = isToday(evento.dataInicio)
            const card = (
              <div
                key={evento.id}
                className={`rounded-xl border border-border overflow-hidden ${encerrado ? "opacity-60" : ""}`}
              >
                {evento.imagem && (
                  <div className="relative h-36 w-full">
                    <Image src={evento.imagem} alt={evento.titulo} fill className="object-cover" />
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDataEvento(evento.dataInicio, evento.dataFim)}
                    </span>
                    {encerrado && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Encerrado
                      </span>
                    )}
                    {hoje && !encerrado && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                        Hoje
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold">{evento.titulo}</p>
                  {evento.local && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {evento.local}
                    </p>
                  )}
                  {evento.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">
                      {evento.descricao}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    {evento.preco != null && evento.preco > 0 ? (
                      <span className="text-xs font-medium flex items-center gap-1 text-primary">
                        <Ticket className="h-3 w-3" />
                        {formatPreco(evento.preco)}
                      </span>
                    ) : evento.preco === 0 ? (
                      <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                        <Ticket className="h-3 w-3" />
                        Gratuito
                      </span>
                    ) : (
                      <span />
                    )}
                    {evento.linkExterno && (
                      <a
                        href={
                          evento.linkExterno.startsWith("http")
                            ? evento.linkExterno
                            : `https://${evento.linkExterno}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
                      >
                        Ver mais
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
            if (!trackComercioId) return card
            return (
              <TrackImpression
                key={evento.id}
                comercioId={trackComercioId}
                tipo="evento_view"
                meta={{ eventoId: evento.id, titulo: evento.titulo }}
              >
                {card}
              </TrackImpression>
            )
          })}
        </div>
      </section>
      <Separator className="mb-6" />
    </>
  )
}
