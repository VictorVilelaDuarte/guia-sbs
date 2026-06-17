// Catálogo curado de comodidades e formas de pagamento para hospedagem.
// Copy centralizada (mesma ideia de plan-features.ts / seo/categorias.ts).
// Os ÍCONES não vivem aqui — ícones lucide não são serializáveis de Server
// para Client Component; o mapa key→ícone fica no componente client que
// renderiza a grade (ver comodidades-grid). Aqui só keys/labels/grupos.

export type GrupoComodidade = "geral" | "quarto" | "lazer" | "vista" | "acessibilidade"

export const GRUPO_LABEL: Record<GrupoComodidade, string> = {
  geral: "Geral",
  quarto: "No quarto",
  lazer: "Lazer",
  vista: "Vista",
  acessibilidade: "Acessibilidade",
}

export interface Comodidade {
  key: string
  label: string
  grupo: GrupoComodidade
}

// Ordem aqui define a ordem de exibição dentro de cada grupo.
export const COMODIDADES: Comodidade[] = [
  // Geral
  { key: "wifi", label: "Wi-Fi", grupo: "geral" },
  { key: "estacionamento", label: "Estacionamento", grupo: "geral" },
  { key: "cafe_da_manha", label: "Café da manhã", grupo: "geral" },
  { key: "piscina", label: "Piscina", grupo: "geral" },
  { key: "recepcao_24h", label: "Recepção 24h", grupo: "geral" },
  { key: "aceita_pets", label: "Aceita pets", grupo: "geral" },
  // No quarto
  { key: "ar_condicionado", label: "Ar-condicionado", grupo: "quarto" },
  { key: "aquecimento", label: "Aquecimento", grupo: "quarto" },
  { key: "tv", label: "TV", grupo: "quarto" },
  { key: "frigobar", label: "Frigobar", grupo: "quarto" },
  { key: "banheiro_privativo", label: "Banheiro privativo", grupo: "quarto" },
  { key: "roupa_de_cama", label: "Roupa de cama e toalhas", grupo: "quarto" },
  // Lazer
  { key: "churrasqueira", label: "Churrasqueira", grupo: "lazer" },
  { key: "lareira", label: "Lareira", grupo: "lazer" },
  { key: "area_de_jogos", label: "Área de jogos", grupo: "lazer" },
  { key: "hidromassagem", label: "Hidromassagem", grupo: "lazer" },
  // Vista
  { key: "vista_montanha", label: "Vista para a montanha", grupo: "vista" },
  { key: "vista_vale", label: "Vista para o vale", grupo: "vista" },
  // Acessibilidade
  { key: "acessivel", label: "Acessível para cadeirantes", grupo: "acessibilidade" },
]

export const COMODIDADE_KEYS = COMODIDADES.map((c) => c.key)

const COMODIDADE_MAP = new Map(COMODIDADES.map((c) => [c.key, c]))

export function comodidadeLabel(key: string): string {
  return COMODIDADE_MAP.get(key)?.label ?? key
}

export function isComodidadeValida(key: string): boolean {
  return COMODIDADE_MAP.has(key)
}

// Agrupa um conjunto de keys nos grupos do catálogo, preservando a ordem.
// Retorna só grupos com itens. Útil para a vitrine e o form.
export function agruparComodidades(
  keys: string[],
): { grupo: GrupoComodidade; label: string; itens: Comodidade[] }[] {
  const set = new Set(keys)
  const grupos: GrupoComodidade[] = ["geral", "quarto", "lazer", "vista", "acessibilidade"]
  return grupos
    .map((g) => ({
      grupo: g,
      label: GRUPO_LABEL[g],
      itens: COMODIDADES.filter((c) => c.grupo === g && set.has(c.key)),
    }))
    .filter((g) => g.itens.length > 0)
}

export interface FormaPagamento {
  key: string
  label: string
}

export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  { key: "pix", label: "Pix" },
  { key: "dinheiro", label: "Dinheiro" },
  { key: "credito", label: "Cartão de crédito" },
  { key: "debito", label: "Cartão de débito" },
  { key: "transferencia", label: "Transferência" },
]

export const FORMA_PAGAMENTO_KEYS = FORMAS_PAGAMENTO.map((f) => f.key)

const FORMA_PAGAMENTO_MAP = new Map(FORMAS_PAGAMENTO.map((f) => [f.key, f]))

export function formaPagamentoLabel(key: string): string {
  return FORMA_PAGAMENTO_MAP.get(key)?.label ?? key
}
