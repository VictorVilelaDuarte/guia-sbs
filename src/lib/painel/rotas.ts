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

const ABAS_VITRINE = new Set(["informacoes", "analytics", "fotos", "eventos", "tags"])

export function rotaPainelLegada(tab: string | null | undefined): string {
  if (tab && ABA_GESTAO[tab]) return ABA_GESTAO[tab]
  if (tab && ABAS_VITRINE.has(tab)) return `/comerciante/vitrine?tab=${tab}`
  return "/comerciante"
}
