export interface CardapioVariacao {
  id: string
  nome: string
  preco: number
  ordem: number
  itemId: string
}

export interface CardapioItem {
  id: string
  titulo: string
  descricao: string | null
  preco: number | null
  imagem: string | null
  disponivel: boolean
  ordem: number
  categoriaId: string
  variacoes: CardapioVariacao[]
}

export interface CardapioCategoria {
  id: string
  nome: string
  ordem: number
  itens: CardapioItem[]
}

export interface ItemFormState {
  titulo: string
  descricao: string
  preco: string
  imagem: string | null
  disponivel: boolean
  categoriaId: string
  variacoes: { nome: string; preco: string }[]
}
