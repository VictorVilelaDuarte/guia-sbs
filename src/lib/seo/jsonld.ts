import type { Categoria } from "@prisma/client"
import type { HorarioDia } from "@/lib/horarios"
import { SITE_URL, SITE_NAME, CIDADE } from "./site"

// Builders de structured data (schema.org). Todos os dados vêm do banco —
// nada precisa ser cadastrado a mais. Renderizar via <JsonLd /> (componente
// em src/components/seo/json-ld.tsx).

// Subtipo de LocalBusiness pela categoria principal (categorias[0])
const TIPO_POR_CATEGORIA: Record<Categoria, string> = {
  ALIMENTACAO: "Restaurant",
  HOSPEDAGEM: "LodgingBusiness",
  COMERCIO: "Store",
  ENTRETENIMENTO: "EntertainmentBusiness",
  TURISMO: "LocalBusiness",
  SERVICO: "LocalBusiness",
}

const DIA_SCHEMA: Record<string, string> = {
  Segunda: "Monday",
  Terça: "Tuesday",
  Quarta: "Wednesday",
  Quinta: "Thursday",
  Sexta: "Friday",
  Sábado: "Saturday",
  Domingo: "Sunday",
}

// Converte o JSON de horários do banco em OpeningHoursSpecification.
// Dias com pausa viram dois intervalos (manhã e tarde).
function openingHours(horarios: HorarioDia[] | null) {
  if (!horarios) return undefined
  const specs = horarios.flatMap((h) => {
    if (!h.aberto) return []
    const dia = DIA_SCHEMA[h.dia]
    if (!dia) return []
    if (h.temPausa && h.pausaInicio && h.pausaFim) {
      return [
        { "@type": "OpeningHoursSpecification", dayOfWeek: dia, opens: h.inicio, closes: h.pausaInicio },
        { "@type": "OpeningHoursSpecification", dayOfWeek: dia, opens: h.pausaFim, closes: h.fim },
      ]
    }
    return [{ "@type": "OpeningHoursSpecification", dayOfWeek: dia, opens: h.inicio, closes: h.fim }]
  })
  return specs.length > 0 ? specs : undefined
}

function postalAddress(c: {
  endereco?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
}) {
  if (!c.endereco && !c.cidade) return undefined
  return {
    "@type": "PostalAddress",
    streetAddress: [c.endereco, c.numero].filter(Boolean).join(", ") || undefined,
    addressLocality: c.cidade ?? CIDADE,
    addressRegion: c.estado ?? "SP",
    postalCode: c.cep ?? undefined,
    addressCountry: "BR",
  }
}

interface ComercioParaJsonLd {
  slug: string
  nome: string
  descricao: string | null
  categorias: Categoria[]
  endereco: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  lat: number | null
  lng: number | null
  telefone: string | null
  whatsapp: string | null
  website: string | null
  instagram: string | null
  logo: string | null
  fotos: { url: string }[]
}

export function comercioJsonLd(
  c: ComercioParaJsonLd,
  opts: { horarios: HorarioDia[] | null; temCardapio: boolean },
) {
  const tipo = TIPO_POR_CATEGORIA[c.categorias[0]] ?? "LocalBusiness"
  const imagens = [...c.fotos.map((f) => f.url), ...(c.logo ? [c.logo] : [])]
  return {
    "@context": "https://schema.org",
    "@type": tipo,
    "@id": `${SITE_URL}/vitrine/${c.slug}`,
    name: c.nome,
    description: c.descricao ?? undefined,
    url: `${SITE_URL}/vitrine/${c.slug}`,
    image: imagens.length > 0 ? imagens : undefined,
    telephone: c.telefone ?? c.whatsapp ?? undefined,
    address: postalAddress(c),
    geo:
      c.lat != null && c.lng != null
        ? { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng }
        : undefined,
    openingHoursSpecification: openingHours(opts.horarios),
    sameAs: c.instagram
      ? [`https://instagram.com/${c.instagram.replace("@", "")}`]
      : undefined,
    ...(opts.temCardapio && tipo === "Restaurant"
      ? { hasMenu: `${SITE_URL}/vitrine/${c.slug}/cardapio` }
      : {}),
  }
}

export function eventoJsonLd(
  e: {
    titulo: string
    descricao: string | null
    dataInicio: Date
    dataFim: Date | null
    imagem: string | null
    local: string | null
    preco: number | null
  },
  comercio: { nome: string; slug: string },
) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.titulo,
    description: e.descricao ?? undefined,
    startDate: e.dataInicio.toISOString(),
    endDate: e.dataFim?.toISOString(),
    image: e.imagem ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: e.local ?? comercio.nome,
      address: { "@type": "PostalAddress", addressLocality: CIDADE, addressRegion: "SP", addressCountry: "BR" },
    },
    organizer: { "@type": "Organization", name: comercio.nome, url: `${SITE_URL}/vitrine/${comercio.slug}` },
    offers:
      e.preco != null
        ? {
            "@type": "Offer",
            price: e.preco,
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
          }
        : undefined,
  }
}

export function pontoTuristicoJsonLd(p: {
  slug: string
  nome: string
  descricao: string | null
  fotos: string[]
  lat: number | null
  lng: number | null
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    "@id": `${SITE_URL}/pontos-turisticos/${p.slug}`,
    name: p.nome,
    description: p.descricao ?? undefined,
    url: `${SITE_URL}/pontos-turisticos/${p.slug}`,
    image: p.fotos.length > 0 ? p.fotos : undefined,
    geo:
      p.lat != null && p.lng != null
        ? { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng }
        : undefined,
    address: { "@type": "PostalAddress", addressLocality: CIDADE, addressRegion: "SP", addressCountry: "BR" },
  }
}

export function breadcrumbJsonLd(itens: { nome: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.nome,
      item: `${SITE_URL}${item.url}`,
    })),
  }
}

// Página "A cidade" (/sao-bento-do-sapucai) — TouristDestination é o tipo
// schema.org para destinos turísticos; inclui as atrações como referência.
export function cidadeJsonLd(opts: {
  imagens: string[]
  atracoes: { nome: string; slug: string }[]
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": `${SITE_URL}/sao-bento-do-sapucai`,
    name: CIDADE,
    description:
      "Cidade turística na Serra da Mantiqueira, interior de São Paulo — montanhas, trilhas, cachoeiras, gastronomia de serra e a Pedra do Baú.",
    url: `${SITE_URL}/sao-bento-do-sapucai`,
    image: opts.imagens.length > 0 ? opts.imagens : undefined,
    geo: { "@type": "GeoCoordinates", latitude: -22.6989, longitude: -45.7281 },
    address: { "@type": "PostalAddress", addressLocality: CIDADE, addressRegion: "SP", addressCountry: "BR" },
    includesAttraction: opts.atracoes.map((a) => ({
      "@type": "TouristAttraction",
      name: a.nome,
      url: `${SITE_URL}/pontos-turisticos/${a.slug}`,
    })),
  }
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: `O guia completo de ${CIDADE}: comércios, eventos, mapa e pontos turísticos.`,
    inLanguage: "pt-BR",
  }
}
