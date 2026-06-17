// Dados editáveis do perfil de hospedagem (sem id/comercioId).
export interface HospedagemPerfilData {
  comodidades: string[]
  checkIn: string | null
  checkOut: string | null
  politicaCancelamento: string | null
  aceitaPets: boolean
  aceitaCriancas: boolean
  formasPagamento: string[]
  observacoes: string | null
}

export interface TipoQuartoData {
  id: string
  nome: string
  descricao: string | null
  precoNoite: number | null
  capacidade: number | null
  camas: string | null
  tamanhoM2: number | null
  comodidades: string[]
  fotos: string[]
  ordem: number
  ativo: boolean
}
