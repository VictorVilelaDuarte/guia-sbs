// Regras compartilhadas de pedido online — usadas pelas APIs (validação) e pela
// UI (labels, cores, botões habilitados). A máquina de estados (TRANSICOES) é a
// fonte única de verdade das mudanças de status. Ver docs/pedido-online.md.

import type { PedidoStatus, TipoEntrega } from "@prisma/client"

export const STATUS_LABEL: Record<PedidoStatus, string> = {
  AGUARDANDO: "Aguardando",
  ACEITO: "Aceito",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  SAIU_ENTREGA: "Saiu para entrega",
  CONCLUIDO: "Concluído",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
}

export const ORIGEM_LABEL: Record<"ONLINE" | "BALCAO" | "TELEFONE", string> = {
  ONLINE: "Online",
  BALCAO: "Balcão",
  TELEFONE: "Telefone",
}

// Ação registrada no histórico do pedido (painel): "Aceito por Ana".
export const HISTORICO_ACAO: Record<PedidoStatus, string> = {
  AGUARDANDO: "Pedido feito",
  ACEITO: "Aceito",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  SAIU_ENTREGA: "Saiu para entrega",
  CONCLUIDO: "Concluído",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
}

// Mensagem voltada ao cliente na página de acompanhamento (mais calorosa que o label seco).
export const STATUS_LABEL_CLIENTE: Record<PedidoStatus, string> = {
  AGUARDANDO: "Aguardando a loja confirmar",
  ACEITO: "Pedido confirmado!",
  EM_PREPARO: "Preparando seu pedido",
  PRONTO: "Pedido pronto",
  SAIU_ENTREGA: "Saiu para entrega",
  CONCLUIDO: "Pedido concluído",
  RECUSADO: "Pedido recusado pela loja",
  CANCELADO: "Pedido cancelado",
}

// Tom para badges (chave de cor; o componente mapeia para classes Tailwind).
export type StatusTom = "amber" | "blue" | "green" | "rose" | "stone"

export const STATUS_TOM: Record<PedidoStatus, StatusTom> = {
  AGUARDANDO: "amber",
  ACEITO: "blue",
  EM_PREPARO: "blue",
  PRONTO: "blue",
  SAIU_ENTREGA: "blue",
  CONCLUIDO: "green",
  RECUSADO: "rose",
  CANCELADO: "rose",
}

export const STATUS_TERMINAIS: PedidoStatus[] = ["CONCLUIDO", "RECUSADO", "CANCELADO"]

export function isStatusTerminal(status: PedidoStatus): boolean {
  return STATUS_TERMINAIS.includes(status)
}

// Máquina de estados. As transições dependem do tipo de entrega: em PRONTO,
// ENTREGA segue para SAIU_ENTREGA e RETIRADA vai direto para CONCLUIDO.
// Recebe o tipo para devolver só transições válidas para aquele pedido.
export function transicoesValidas(
  status: PedidoStatus,
  tipoEntrega: TipoEntrega,
): PedidoStatus[] {
  switch (status) {
    case "AGUARDANDO":
      return ["ACEITO", "RECUSADO", "CANCELADO"]
    case "ACEITO":
      return ["EM_PREPARO", "CANCELADO"]
    case "EM_PREPARO":
      return ["PRONTO", "CANCELADO"]
    case "PRONTO":
      return tipoEntrega === "ENTREGA"
        ? ["SAIU_ENTREGA", "CANCELADO"]
        : ["CONCLUIDO", "CANCELADO"]
    case "SAIU_ENTREGA":
      return ["CONCLUIDO", "CANCELADO"]
    default:
      return [] // terminais
  }
}

export function podeTransicionar(
  de: PedidoStatus,
  para: PedidoStatus,
  tipoEntrega: TipoEntrega,
): boolean {
  return transicoesValidas(de, tipoEntrega).includes(para)
}

// Cliente só pode cancelar enquanto a loja ainda não agiu.
export function clientePodeCancelar(status: PedidoStatus): boolean {
  return status === "AGUARDANDO"
}

// Status que pedem `motivoCancelamento` quando a loja os aplica.
export function exigeMotivo(status: PedidoStatus): boolean {
  return status === "RECUSADO" || status === "CANCELADO"
}

// Sequência de etapas exibida na timeline de acompanhamento do cliente.
// Difere por tipo de entrega: retirada não passa por SAIU_ENTREGA.
export function passosFluxo(tipoEntrega: TipoEntrega): PedidoStatus[] {
  return tipoEntrega === "ENTREGA"
    ? ["AGUARDANDO", "ACEITO", "EM_PREPARO", "PRONTO", "SAIU_ENTREGA", "CONCLUIDO"]
    : ["AGUARDANDO", "ACEITO", "EM_PREPARO", "PRONTO", "CONCLUIDO"]
}

// Agrupamento usado no painel do comerciante (kanban simples).
export type GrupoPedido = "novos" | "andamento" | "encerrados"

export function grupoDoStatus(status: PedidoStatus): GrupoPedido {
  if (status === "AGUARDANDO") return "novos"
  if (isStatusTerminal(status)) return "encerrados"
  return "andamento"
}

// --- Cálculo de total (fonte única; o servidor é a autoridade) ---
// Em CENTAVOS inteiros (Fase 3): o preço do produto ainda é Float e é arredondado
// uma única vez aqui; a soma em centavos é exata e o pedido grava Decimal exato.

export interface ItemCalculo {
  precoUnit: number // reais (preço vigente do produto)
  quantidade: number
}

export function centavosDe(reais: number): number {
  return Math.round((reais + Number.EPSILON) * 100)
}

export function calcularSubtotalCentavos(itens: ItemCalculo[]): number {
  return itens.reduce((acc, i) => acc + centavosDe(i.precoUnit) * i.quantidade, 0)
}

// Preço vigente de um produto sem variação: promoção ativa vence o preço cheio.
// Usado pelo checkout e pela venda manual (o servidor é a autoridade do preço).
export function precoEfetivo(p: {
  preco: number | null
  precoPromo: number | null
  promoFim: Date | null
}): number | null {
  const promoAtiva = p.precoPromo != null && (!p.promoFim || p.promoFim.getTime() > Date.now())
  return promoAtiva ? p.precoPromo : p.preco
}

// Evita ruído de ponto flutuante (R$) — 2 casas.
export function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}
