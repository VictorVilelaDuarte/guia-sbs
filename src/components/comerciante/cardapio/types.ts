export interface CardapioVariacao {
  id: string
  nome: string
  preco: number
  ordem: number
  produtoId: string
}

export type TipoProduto = "PRODUTO" | "SERVICO"

export interface Produto {
  id: string
  tipo: TipoProduto
  titulo: string
  descricao: string | null
  preco: number | null
  imagens: string[]
  disponivel: boolean
  destaque: boolean
  precoPromo: number | null
  promoFim: Date | string | null
  ordem: number
  comercioId: string
  categoriaCardapioId: string | null
  categoriaCardapio: { id: string; nome: string } | null
  variacoes: CardapioVariacao[]
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CardapioCategoria {
  id: string
  nome: string
  ordem: number
  produtos: Produto[]
}

export interface ProdutoFormState {
  tipo: TipoProduto
  titulo: string
  descricao: string
  preco: string
  imagens: string[]
  disponivel: boolean
  destaque: boolean
  precoPromo: string
  promoFim: string
  variacoes: { nome: string; preco: string }[]
  incluirNoCardapio: boolean
  categoriaCardapioId: string
}
