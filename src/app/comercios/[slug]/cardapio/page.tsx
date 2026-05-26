import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { temFeature } from "@/lib/plan-features"
import { CardapioView } from "@/components/public/cardapio-view"

interface HorarioDia {
  dia: string
  aberto: boolean
  inicio: string
  fim: string
  temPausa?: boolean
  pausaInicio?: string
  pausaFim?: string
}

function parseHorarios(value: string | null): HorarioDia[] | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.length === 7) return parsed
  } catch {}
  return null
}

function getDiaAtual(): string {
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  })
  const diaSemana = formatter.format(new Date())
  return dias.find((d) => diaSemana.toLowerCase().startsWith(d.toLowerCase())) ?? dias[new Date().getDay()]
}

const ORDEM_DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function proximoDiaAberto(horarios: HorarioDia[], diaAtual: string) {
  const idx = ORDEM_DIAS.indexOf(diaAtual)
  if (idx < 0) return null
  for (let i = 1; i <= 7; i++) {
    const prox = horarios.find((h) => h.dia === ORDEM_DIAS[(idx + i) % 7])
    if (prox?.aberto) return { dia: i === 1 ? "amanhã" : prox.dia.toLowerCase(), inicio: prox.inicio }
  }
  return null
}

function estaAbertoAgora(h: HorarioDia, horarios: HorarioDia[]): { aberto: boolean; label: string } {
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const comercio = await prisma.comercio.findUnique({
    where: { slug },
    select: { nome: true },
  })
  if (!comercio) return {}
  return { title: `Cardápio — ${comercio.nome}` }
}

export default async function PaginaCardapio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const comercio = await prisma.comercio.findUnique({
    where: { slug },
    select: {
      nome: true,
      logo: true,
      slug: true,
      whatsapp: true,
      telefone: true,
      horarios: true,
      plan: { select: { features: true } },
      cardapioCategorias: {
        orderBy: { ordem: "asc" },
        include: {
          produtos: {
            where: { disponivel: true },
            orderBy: { ordem: "asc" },
            include: { variacoes: { orderBy: { ordem: "asc" } } },
          },
        },
      },
    },
  })

  if (!comercio) notFound()

  if (!temFeature(comercio.plan.features, "cardapio")) notFound()

  const categoriasComProdutos = comercio.cardapioCategorias.filter((c) => c.produtos.length > 0)

  if (categoriasComProdutos.length === 0) notFound()

  const horarios = parseHorarios(comercio.horarios)
  const diaAtual = getDiaAtual()
  const horarioHoje = horarios?.find((h) => h.dia === diaAtual)
  const statusAgora = horarios && horarioHoje ? estaAbertoAgora(horarioHoje, horarios) : null
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()

  return (
    <CardapioView
      nome={comercio.nome}
      logo={comercio.logo}
      slug={comercio.slug}
      whatsapp={comercio.whatsapp}
      telefone={comercio.telefone}
      statusAgora={statusAgora}
      now={now}
      categorias={categoriasComProdutos.map((cat) => ({
        id: cat.id,
        nome: cat.nome,
        produtos: cat.produtos.map((p) => ({
          id: p.id,
          titulo: p.titulo,
          descricao: p.descricao,
          preco: p.preco,
          precoPromo: p.precoPromo,
          promoFim: p.promoFim ? p.promoFim.toISOString() : null,
          destaque: p.destaque,
          imagens: p.imagens,
          variacoes: p.variacoes.map((v) => ({
            id: v.id,
            nome: v.nome,
            preco: v.preco,
          })),
        })),
      }))}
    />
  )
}
