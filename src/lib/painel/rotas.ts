// Módulo sem dependências: importado pelo middleware (Edge). Não adicionar imports.

// Abas do antigo /comerciante/dashboard?tab= → rota equivalente do painel
// dividido em Vitrine e Gestão. Mantido para links salvos e para o service
// worker de push antigo, que segue abrindo /comerciante/dashboard?tab=pedidos
// até o navegador baixar a versão nova.
const ABA_GESTAO: Record<string, string> = {
  pedidos: "/comerciante/gestao/pedidos",
  cardapio: "/comerciante/gestao/cardapio",
  produtos: "/comerciante/gestao/produtos",
  servicos: "/comerciante/gestao/produtos?tipo=servico",
  hospedagem: "/comerciante/gestao/acomodacoes",
}

// Abas da antiga página única da vitrine (?tab=) → página própria (2026-09-24).
// Usado pelo middleware (links /comerciante/dashboard?tab=) e por
// /comerciante/vitrine, que redireciona o ?tab= de links salvos.
const ABA_VITRINE: Record<string, string> = {
  informacoes: "/comerciante/vitrine/perfil",
  analytics: "/comerciante/vitrine/visitas",
  fotos: "/comerciante/vitrine/fotos",
  hospedagem: "/comerciante/vitrine/comodidades",
  eventos: "/comerciante/vitrine/eventos",
  tags: "/comerciante/vitrine/palavras-chave",
}

export function rotaAbaVitrine(tab: string | null | undefined): string | null {
  return (tab && ABA_VITRINE[tab]) || null
}

export function rotaPainelLegada(tab: string | null | undefined): string {
  if (tab && ABA_GESTAO[tab]) return ABA_GESTAO[tab]
  return rotaAbaVitrine(tab) ?? "/comerciante"
}
