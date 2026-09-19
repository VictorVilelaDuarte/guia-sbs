export interface Variacao {
  id: string;
  nome: string;
  preco: number;
}

// Complementos do item ("Adicionais", "Ponto da carne") — ver
// src/lib/gestao/complementos.ts. O preço entra no valor unitário do item.
export interface OpcaoComplementoPublica {
  id: string;
  nome: string;
  preco: number;
  quantidadeMax: number;
}

export interface GrupoComplementoPublico {
  id: string;
  nome: string;
  minimo: number;
  maximo: number;
  opcoes: OpcaoComplementoPublica[];
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
  complementos?: GrupoComplementoPublico[];
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
