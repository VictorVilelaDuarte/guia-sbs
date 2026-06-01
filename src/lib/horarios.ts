import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export interface HorarioDia {
  dia: string
  aberto: boolean
  inicio: string
  fim: string
  temPausa?: boolean
  pausaInicio?: string
  pausaFim?: string
}

export function formatHorario(h: HorarioDia): string {
  if (!h.aberto) return "Fechado"
  if (h.temPausa && h.pausaInicio && h.pausaFim)
    return `${h.inicio} – ${h.pausaInicio} · ${h.pausaFim} – ${h.fim}`
  return `${h.inicio} – ${h.fim}`
}

export function parseHorarios(value: string | null): HorarioDia[] | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.length === 7) return parsed
  } catch {}
  return null
}

const ORDEM_DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

export function getDiaAtual(): string {
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  })
  const diaSemana = formatter.format(new Date())
  return (
    dias.find((d) => diaSemana.toLowerCase().startsWith(d.toLowerCase())) ??
    dias[new Date().getDay()]
  )
}

function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function proximoDiaAberto(horarios: HorarioDia[], diaAtual: string) {
  const idx = ORDEM_DIAS.indexOf(diaAtual)
  if (idx < 0) return null
  for (let i = 1; i <= 7; i++) {
    const prox = horarios.find((h) => h.dia === ORDEM_DIAS[(idx + i) % 7])
    if (prox?.aberto) {
      return { dia: i === 1 ? "amanhã" : prox.dia.toLowerCase(), inicio: prox.inicio }
    }
  }
  return null
}

export function estaAbertoAgora(
  h: HorarioDia,
  horarios: HorarioDia[],
): { aberto: boolean; label: string } {
  const labelFechado = () => {
    const prox = proximoDiaAberto(horarios, h.dia)
    return prox ? `Volta ${prox.dia} às ${prox.inicio}` : "Fechado"
  }

  if (!h.aberto) return { aberto: false, label: labelFechado() }

  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? 0)
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? 0)
  const agoraMin = hora * 60 + minuto

  const inicioMin = horaParaMinutos(h.inicio)
  const fimMin = horaParaMinutos(h.fim)

  if (agoraMin < inicioMin) return { aberto: false, label: `Abre às ${h.inicio}` }
  if (agoraMin >= fimMin) return { aberto: false, label: labelFechado() }

  if (h.temPausa && h.pausaInicio && h.pausaFim) {
    const pausaInicioMin = horaParaMinutos(h.pausaInicio)
    const pausaFimMin = horaParaMinutos(h.pausaFim)
    if (agoraMin >= pausaInicioMin && agoraMin < pausaFimMin) {
      return { aberto: false, label: `Em pausa · volta às ${h.pausaFim}` }
    }
  }

  return { aberto: true, label: `Aberto · fecha às ${h.fim}` }
}

export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}

export function formatPreco(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`
}

export function formatDataEvento(inicio: Date, fim: Date | null): string {
  const mesInicio = format(inicio, "d 'de' MMM", { locale: ptBR })
  if (!fim || format(inicio, "yyyy-MM-dd") === format(fim, "yyyy-MM-dd")) {
    return `${mesInicio} às ${format(inicio, "HH:mm")}`
  }
  return `${mesInicio} – ${format(fim, "d 'de' MMM", { locale: ptBR })}`
}
