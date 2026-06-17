// Vocabulário compartilhado entre a coleta (client), o endpoint /api/track e
// as queries de agregação. Strings (não enum Prisma) para adicionar tipos
// novos sem migration — ex.: "qr" e "busca" já previstos como origem.

export const TIPOS_EVENTO = [
  "view",
  "click_whatsapp",
  "click_ligar",
  "click_instagram",
  "click_site",
  "click_rota",
  "click_share",
  "click_reserva",
  "cardapio_view",
  "catalogo_view",
  "item_view",
  "evento_view",
  "galeria_view",
] as const

export type TipoEvento = (typeof TIPOS_EVENTO)[number]

export const ORIGENS = [
  "home_destaque",
  "home_abertos",
  "home_eventos",
  "eventos",
  "listagem",
  "mapa",
  "busca",
  "qr",
  "google",
  "direto",
] as const

export type Origem = (typeof ORIGENS)[number]

export const ORIGEM_LABEL: Record<Origem, string> = {
  home_destaque: "Destaque na home",
  home_abertos: "Abertos agora",
  home_eventos: "Eventos na home",
  eventos: "Página de eventos",
  listagem: "Lista de comércios",
  mapa: "Mapa",
  busca: "Busca",
  qr: "QR Code",
  google: "Google",
  direto: "Direto / link",
}

// ── Tipos do resumo agregado (retorno de getAnalyticsResumo) ──
// Vivem aqui (e não em queries.ts) para o painel client importar os tipos sem
// arrastar o módulo server que usa Prisma.

export interface TotaisPeriodo {
  views: number
  whatsapp: number
  rotas: number
  prevViews: number
  prevWhatsapp: number
  prevRotas: number
}

export interface PontoDiario {
  dia: string // "2026-06-11"
  views: number
  cliques: number
}

export interface AnalyticsResumo {
  d7: TotaisPeriodo
  d30: TotaisPeriodo
  serieDiaria: PontoDiario[] // últimos 30 dias, com zeros preenchidos
  origens: { origem: Origem | "desconhecida"; total: number }[]
  topItens: { titulo: string; total: number }[]
  funil: { views: number; cardapio: number; whatsapp: number }
  pico: { diaSemana: string; faixa: string } | null
}
