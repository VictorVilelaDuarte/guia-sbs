export interface Variacao {
  id: string;
  nome: string;
  preco: number;
}

export interface Produto {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  precoPromo: number | null;
  promoFim: string | null;
  destaque: boolean;
  imagens: string[];
  variacoes: Variacao[];
}

export interface Categoria {
  id: string;
  nome: string;
  produtos: Produto[];
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isPromoAtiva(
  precoPromo: number | null,
  promoFim: string | null,
  now: number,
): boolean {
  if (precoPromo == null) return false;
  if (!promoFim) return true;
  return new Date(promoFim).getTime() > now;
}
