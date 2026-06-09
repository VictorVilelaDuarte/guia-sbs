import type { Categoria, CategoriaPonto, Dificuldade } from "@prisma/client"

export type HorarioItem = {
  dia: string
  aberto: boolean
  inicio: string
  fim: string
  temPausa?: boolean
  pausaInicio?: string
  pausaFim?: string
}

export type ComercioMapa = {
  id: string
  nome: string
  slug: string
  logo: string | null
  fotos: string[]
  categorias: Categoria[]
  lat: number
  lng: number
  aberto: boolean
  statusLabel: string
  horarios: HorarioItem[] | null
  whatsapp: string | null
}

export type PontoMapa = {
  id: string
  nome: string
  slug: string
  descricao: string | null
  fotos: string[]
  categoria: CategoriaPonto
  dificuldade: Dificuldade | null
  distanciaKm: number | null
  duracaoMin: number | null
  altitudeM: number | null
  temPiscinaNatural: boolean | null
  precisaGuia: boolean | null
  periodo: string | null
  lat: number
  lng: number
}

export type SelectedItem =
  | { tipo: "comercio"; data: ComercioMapa }
  | { tipo: "ponto"; data: PontoMapa }
