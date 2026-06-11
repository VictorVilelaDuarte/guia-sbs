/* eslint-disable react-hooks/purity */
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { GaleriaFotos } from "@/components/public/galeria-fotos"
import { CardapioDestaquesVitrine } from "@/components/public/cardapio-destaques-vitrine"
import { temFeature } from "@/lib/plan-features"
import { Camera, ExternalLink, ShoppingBag, UtensilsCrossed, Wrench } from "lucide-react"
import { parseHorarios, getDiaAtual, estaAbertoAgora } from "./_utils"
import { Topbar } from "./_components/topbar"
import { VitrineTracker } from "@/components/public/analytics/vitrine-tracker"
import { TrackImpression } from "@/components/public/analytics/track-impression"
import { Identidade } from "./_components/identidade"
import { StatusAberto } from "./_components/status-aberto"
import { CtasRapidos } from "./_components/ctas-rapidos"
import { SecaoEventos } from "./_components/secao-eventos"
import { SecaoHorarios } from "./_components/secao-horarios"
import { SecaoLocalizacao } from "./_components/secao-localizacao"
import { SecaoContato } from "./_components/secao-contato"

type ItemDestaque = {
  id: string
  titulo: string
  descricao: string | null
  preco: number | null
  precoPromo: number | null
  promoFim: string | null
  destaque: boolean
  imagens: string[]
  variacoes: { id: string; nome: string; preco: number }[]
  categoriaNome: string
}

function mapItemParaDestaque(
  p: {
    id: string
    titulo: string
    descricao: string | null
    preco: number | null
    precoPromo: number | null
    promoFim: Date | null
    destaque: boolean
    imagens: string[]
    variacoes: { id: string; nome: string; preco: number }[]
  },
  categoriaNome: string,
): ItemDestaque {
  return {
    id: p.id,
    titulo: p.titulo,
    descricao: p.descricao,
    preco: p.preco,
    precoPromo: p.precoPromo,
    promoFim: p.promoFim ? p.promoFim.toISOString() : null,
    destaque: p.destaque,
    imagens: p.imagens,
    variacoes: p.variacoes.map((v) => ({ id: v.id, nome: v.nome, preco: v.preco })),
    categoriaNome,
  }
}

export default async function PaginaComercio({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const comercio = await prisma.comercio.findUnique({
    where: { slug },
    include: {
      fotos: { orderBy: { ordem: "asc" } },
      tags: { orderBy: { nome: "asc" } },
      produtos: {
        where: { disponivel: true, destaque: true, categoriaCardapioId: null },
        orderBy: { ordem: "asc" },
        include: { variacoes: { orderBy: { ordem: "asc" } } },
      },
      eventos: { orderBy: { dataInicio: "asc" } },
      plan: true,
      cardapioCategorias: {
        orderBy: { ordem: "asc" },
        include: {
          produtos: {
            where: { disponivel: true, destaque: true },
            orderBy: { ordem: "asc" },
            include: { variacoes: { orderBy: { ordem: "asc" } } },
          },
        },
      },
    },
  })

  if (!comercio) notFound()

  const isPublicado = comercio.status === "ATIVO"
  const temEventos = temFeature(comercio.plan.features, "eventos")
  const temCardapio = temFeature(comercio.plan.features, "cardapio")
  const temCatalogo = temFeature(comercio.plan.features, "catalogo")

  const itensDestaque: ItemDestaque[] = temCardapio
    ? comercio.cardapioCategorias.flatMap((cat) =>
        cat.produtos.map((p) => mapItemParaDestaque(p, cat.nome)),
      )
    : []

  const produtosDestaque: ItemDestaque[] = temCatalogo
    ? comercio.produtos
        .filter((p) => p.tipo === "PRODUTO")
        .map((p) => mapItemParaDestaque(p, "Produto"))
    : []

  const servicosDestaque: ItemDestaque[] = temCatalogo
    ? comercio.produtos
        .filter((p) => p.tipo === "SERVICO")
        .map((p) => mapItemParaDestaque(p, "Serviço"))
    : []

  const horarios = parseHorarios(comercio.horarios)
  const diaAtual = getDiaAtual()
  const horarioHoje = horarios?.find((h) => h.dia === diaAtual)
  const statusAgora =
    horarios && horarioHoje ? estaAbertoAgora(horarioHoje, horarios) : null

  const enderecoCompleto = [
    comercio.endereco,
    comercio.numero,
    comercio.bairro,
    comercio.cidade,
    comercio.estado,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="min-h-screen bg-background">
      {/* Pré-visualização (status != ATIVO) não conta nas métricas */}
      {isPublicado && <VitrineTracker comercioId={comercio.id} />}
      <Topbar nome={comercio.nome} isPublicado={isPublicado} status={comercio.status} />

      <div className="max-w-2xl mx-auto px-4">
        <Identidade logo={comercio.logo} descricao={comercio.descricao} />

        <StatusAberto statusAgora={statusAgora} />

        <CtasRapidos
          whatsapp={comercio.whatsapp}
          instagram={comercio.instagram}
          lat={comercio.lat}
          lng={comercio.lng}
          website={comercio.website}
          telefone={comercio.telefone}
        />

        {/* Galeria de fotos */}
        {comercio.fotos.length > 0 && (
          <>
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                Fotos
              </h2>
              <GaleriaFotos fotos={comercio.fotos} nomeComercio={comercio.nome} />
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Cardápio — apenas destaques */}
        {temCardapio && itensDestaque.length > 0 && (
          <>
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Cardápio
                </h2>
                <Link
                  href={`/vitrine/${comercio.slug}/cardapio`}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  Ver completo
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <CardapioDestaquesVitrine produtos={itensDestaque} now={Date.now()} />
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Produtos em destaque */}
        {temCatalogo && produtosDestaque.length > 0 && (
          <>
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Produtos
                </h2>
                <Link
                  href={`/vitrine/${comercio.slug}/catalogo`}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  Ver catálogo
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <CardapioDestaquesVitrine produtos={produtosDestaque} now={Date.now()} />
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {/* Serviços em destaque */}
        {temCatalogo && servicosDestaque.length > 0 && (
          <>
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" />
                  Serviços
                </h2>
                <Link
                  href={`/vitrine/${comercio.slug}/catalogo`}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  Ver catálogo
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <CardapioDestaquesVitrine produtos={servicosDestaque} now={Date.now()} />
            </section>
            <Separator className="mb-6" />
          </>
        )}

        {temEventos && comercio.eventos.length > 0 && (
          <SecaoEventos
            eventos={comercio.eventos}
            trackComercioId={isPublicado ? comercio.id : undefined}
          />
        )}

        {horarios && <SecaoHorarios horarios={horarios} diaAtual={diaAtual} />}

        {enderecoCompleto && (
          <SecaoLocalizacao
            enderecoCompleto={enderecoCompleto}
            lat={comercio.lat}
            lng={comercio.lng}
            nome={comercio.nome}
            logo={comercio.logo}
          />
        )}

        <SecaoContato
          telefone={comercio.telefone}
          whatsapp={comercio.whatsapp}
          email={comercio.email}
          website={comercio.website}
          instagram={comercio.instagram}
        />
      </div>

      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Guia SBS</span> · São Bento do Sapucaí
      </div>
    </div>
  )
}
