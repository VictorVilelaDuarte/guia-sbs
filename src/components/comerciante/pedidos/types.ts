import type { PedidoStatus, TipoEntrega } from "@prisma/client"

export interface PedidoItemAdmin {
  id: string
  titulo: string
  variacaoNome: string | null
  precoUnit: number
  quantidade: number
  observacao: string | null
}

export interface PedidoAdmin {
  id: string
  token: string
  numero: number
  status: PedidoStatus
  tipoEntrega: TipoEntrega
  clienteNome: string
  clienteWhats: string
  cep: string | null
  endereco: string | null
  numeroEnd: string | null
  bairro: string | null
  complemento: string | null
  referencia: string | null
  formaPagamento: string
  trocoPara: number | null
  observacoes: string | null
  subtotal: number
  taxaEntrega: number
  total: number
  motivoCancelamento: string | null
  createdAt: string // ISO
  itens: PedidoItemAdmin[]
}

export interface PedidoConfigData {
  aceitaPedidos: boolean
  entregaAtiva: boolean
  retiradaAtiva: boolean
  pedidoMinimo: number
  tempoPreparoMin: number | null
  formasPagamento: string[]
}

// Entrada do catálogo canônico de bairros (admin) — para o comerciante selecionar.
export interface BairroCatalogo {
  id: string
  nome: string
  cidade: string
  uf: string
}

// Área de entrega configurada pela loja (catálogo ou custom) + taxa.
export interface ZonaEntregaData {
  id: string
  bairroId: string | null
  nome: string
  cidade: string
  uf: string
  taxa: number
  ativo: boolean
}
