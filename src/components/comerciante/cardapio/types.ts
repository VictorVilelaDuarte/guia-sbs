export interface CardapioVariacao {
  id: string
  nome: string
  preco: number
  ordem: number
  produtoId: string
  codigoBarras?: string | null
  codigoInterno?: string | null
  precoCusto?: number | null
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
  categoriaCatalogoId: string | null
  categoriaCatalogo: { id: string; nome: string } | null
  variacoes: CardapioVariacao[]
  // Grupos de complementos do produto ("Borda", "Adicionais").
  complementos?: { grupoId: string }[]
  // Identificação, custo e onde aparece (opcionais no cadastro).
  codigoBarras?: string | null
  codigoInterno?: string | null
  marca?: string | null
  precoCusto?: number | null
  unidade?: string
  mostrarNaVitrine?: boolean
  arquivado?: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CardapioCategoria {
  id: string
  nome: string
  ordem: number
  produtos: Produto[]
}

// Categoria do catálogo — separada por tipo (PRODUTO/SERVICO).
export interface CatalogoCategoria {
  id: string
  nome: string
  tipo: TipoProduto
  ordem: number
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
  variacoes: { nome: string; preco: string; codigoBarras: string; precoCusto: string }[]
  complementoIds: string[]
  codigoBarras: string
  codigoInterno: string
  marca: string
  precoCusto: string
  unidade: string
  mostrarNaVitrine: boolean
  arquivado: boolean
  incluirNoCardapio: boolean
  categoriaCardapioId: string
  categoriaCatalogoId: string
}
