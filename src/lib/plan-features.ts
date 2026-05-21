export const FEATURES_DISPONIVEIS = [
  {
    key: "eventos",
    label: "Eventos",
    descricao: "Criar e exibir eventos no perfil público",
  },
  {
    key: "fotos_ilimitadas",
    label: "Fotos ilimitadas",
    descricao: "Upload sem limite de quantidade de fotos (plano FREE tem limite de 5)",
  },
  {
    key: "destaque_busca",
    label: "Destaque na busca",
    descricao: "Perfil em posição destacada nos resultados de busca",
  },
  {
    key: "analytics",
    label: "Analytics",
    descricao: "Acesso a estatísticas de visualizações e cliques do perfil",
  },
  {
    key: "qr_code",
    label: "QR Code",
    descricao: "Geração de QR Code personalizado do perfil para impressão",
  },
  {
    key: "cardapio",
    label: "Cardápio",
    descricao: "Cardápio digital com categorias e itens organizados por ordem",
  },
] as const

export type FeatureKey = (typeof FEATURES_DISPONIVEIS)[number]["key"]
export type PlanFeatures = Partial<Record<FeatureKey, boolean>>

export const LIMITES_FREE = {
  fotos: 3,
  tags: 5,
  produtos: 3,
} as const

export function temFeature(features: unknown, key: FeatureKey): boolean {
  if (!features || typeof features !== "object") return false
  return (features as Record<string, unknown>)[key] === true
}
