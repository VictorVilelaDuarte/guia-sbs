import type { TipoChamado } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { ComercioCtx } from "@/lib/comercio-ctx"
import { paraCentavos, paraNumero } from "@/lib/dinheiro"
import { calcularDivisao, type PlanoDivisao } from "@/lib/gestao/divisao"
export { linkDaMesa } from "@/lib/gestao/mesas-link"
import { novoToken } from "@/lib/gestao/mesas-token"
export { novoToken }
import { ErroVenda, autorNomeDe } from "@/lib/gestao/vendas"
import { temFeature } from "@/lib/plan-features"

// Mesas com QR Code (docs/gestao-ideias.md 5.2). O QR é fixo e aponta para
// /mesa/[token]: o cliente vê a conta da mesa em tempo real, chama o garçom e
// pede a conta. O token é um segredo só da mesa — trocá-lo invalida o adesivo
// antigo sem apagar a mesa nem o histórico.
//
// A página da mesa é PÚBLICA (sem login): tudo que ela mostra passa por
// `contaDaMesa`, que só devolve o que o cliente da mesa pode ver — nunca
// telefone de cliente, endereço ou dado de outra comanda.

const MIN_ENTRE_CHAMADOS = 2 // minutos: repetir o toque não gera chamado novo

function nomeNormalizado(nome: string) {
  return nome.trim().replace(/\s+/g, " ").slice(0, 20)
}

// ---- cadastro (painel) --------------------------------------------------------------

export async function listarMesas(comercioId: string) {
  const mesas = await prisma.mesa.findMany({
    where: { comercioId },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: {
      id: true, nome: true, area: true, token: true, ativa: true, ordem: true,
      pedidos: { where: { status: "ABERTA" }, select: { id: true, numero: true, total: true }, take: 1 },
    },
  })
  return mesas.map((m) => ({
    id: m.id,
    nome: m.nome,
    area: m.area,
    token: m.token,
    ativa: m.ativa,
    ordem: m.ordem,
    comandaAberta: m.pedidos[0] ? { id: m.pedidos[0].id, numero: m.pedidos[0].numero, total: paraNumero(m.pedidos[0].total) } : null,
  }))
}

export type MesaPainel = Awaited<ReturnType<typeof listarMesas>>[number]

export async function criarMesa(ctx: ComercioCtx, input: { nome: string; area?: string | null }) {
  const nome = nomeNormalizado(input.nome)
  if (!nome) throw new ErroVenda("Informe o nome da mesa.")
  const existe = await prisma.mesa.findFirst({ where: { comercioId: ctx.comercioId, nome: { equals: nome, mode: "insensitive" } } })
  if (existe) throw new ErroVenda(`Já existe a mesa ${nome}.`, 409)
  const ultima = await prisma.mesa.aggregate({ where: { comercioId: ctx.comercioId }, _max: { ordem: true } })
  await prisma.mesa.create({
    data: {
      comercioId: ctx.comercioId,
      nome,
      area: input.area?.trim().slice(0, 40) || null,
      token: novoToken(),
      ordem: (ultima._max.ordem ?? -1) + 1,
    },
  })
  return listarMesas(ctx.comercioId)
}

export async function atualizarMesa(
  ctx: ComercioCtx,
  id: string,
  input: { nome?: string; area?: string | null; ativa?: boolean; trocarToken?: boolean },
) {
  const mesa = await prisma.mesa.findFirst({ where: { id, comercioId: ctx.comercioId } })
  if (!mesa) throw new ErroVenda("Mesa não encontrada.", 404)
  const nome = input.nome !== undefined ? nomeNormalizado(input.nome) : undefined
  if (nome !== undefined) {
    if (!nome) throw new ErroVenda("Informe o nome da mesa.")
    const outra = await prisma.mesa.findFirst({
      where: { comercioId: ctx.comercioId, nome: { equals: nome, mode: "insensitive" }, id: { not: id } },
    })
    if (outra) throw new ErroVenda(`Já existe a mesa ${nome}.`, 409)
  }
  await prisma.mesa.update({
    where: { id },
    data: {
      ...(nome !== undefined ? { nome } : {}),
      ...(input.area !== undefined ? { area: input.area?.trim().slice(0, 40) || null } : {}),
      ...(input.ativa !== undefined ? { ativa: input.ativa } : {}),
      ...(input.trocarToken ? { token: novoToken() } : {}),
    },
  })
  return listarMesas(ctx.comercioId)
}

export async function excluirMesa(ctx: ComercioCtx, id: string) {
  const mesa = await prisma.mesa.findFirst({
    where: { id, comercioId: ctx.comercioId },
    select: { id: true, pedidos: { where: { status: "ABERTA" }, select: { numero: true }, take: 1 } },
  })
  if (!mesa) throw new ErroVenda("Mesa não encontrada.", 404)
  if (mesa.pedidos[0]) throw new ErroVenda(`Feche a comanda #${mesa.pedidos[0].numero} antes de excluir a mesa.`, 409)
  // O histórico das comandas fica: Pedido.mesaId é SetNull e o nome continua no snapshot.
  await prisma.mesa.delete({ where: { id } })
  return listarMesas(ctx.comercioId)
}

// Mesa cadastrada com este nome (usado ao abrir comanda pelo PDV, para o QR
// daquela mesa passar a mostrar a conta).
export async function mesaPorNome(comercioId: string, nome: string | null | undefined) {
  if (!nome) return null
  return prisma.mesa.findFirst({
    where: { comercioId, nome: { equals: nomeNormalizado(nome), mode: "insensitive" } },
    select: { id: true },
  })
}

// ---- página pública da mesa ---------------------------------------------------------

export interface ContaDaMesa {
  loja: { nome: string; slug: string; logo: string | null; whatsapp: string | null; temCardapio: boolean }
  mesa: { nome: string; area: string | null }
  permite: { abrirConta: boolean; pedido: boolean; chamarGarcom: boolean; pedirConta: boolean }
  comanda: null | {
    numero: number
    abertaEm: string
    itens: { id: string; titulo: string; variacaoNome: string | null; quantidade: number; valor: number; observacao: string | null; estado: "lancado" | "producao" | "pronto" }[]
    subtotal: number
    desconto: number
    taxaServico: number
    servicoPercentual: number | null
    total: number
    pago: number
    saldo: number
    pessoas: { nome: string; valor: number }[] // divisão montada pelo garçom
  }
  chamadoPendente: { tipo: TipoChamado; criadoEm: string } | null
}

// Resolve a mesa pelo token do QR e devolve SÓ o que o cliente da mesa pode ver.
export async function contaDaMesa(token: string): Promise<ContaDaMesa | null> {
  const mesa = await prisma.mesa.findUnique({
    where: { token },
    select: {
      id: true, nome: true, area: true, ativa: true, comercioId: true,
      comercio: {
        select: {
          nome: true, slug: true, logo: true, whatsapp: true, status: true,
          plan: { select: { features: true } },
          pedidoConfig: { select: { mesaQrAbrirConta: true, mesaQrPedido: true, mesaQrChamarGarcom: true, mesaQrPedirConta: true } },
        },
      },
    },
  })
  if (!mesa || !mesa.ativa) return null
  const c = mesa.comercio
  if (c.status !== "ATIVO" || !temFeature(c.plan.features, "gestao_relatorios")) return null

  const cfg = c.pedidoConfig
  const comanda = await prisma.pedido.findFirst({
    where: { comercioId: mesa.comercioId, status: "ABERTA", mesaId: mesa.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, numero: true, createdAt: true, subtotal: true, desconto: true, taxaServico: true, servicoPercentual: true, total: true, divisao: true,
      itens: { orderBy: { createdAt: "asc" }, select: { id: true, titulo: true, variacaoNome: true, quantidade: true, precoUnit: true, desconto: true, observacao: true, enviadoEm: true, prontoEm: true } },
      pagamentos: { where: { estornadoEm: null }, select: { valor: true } },
    },
  })

  const chamado = await prisma.chamadoMesa.findFirst({
    where: { mesaId: mesa.id, atendidoEm: null },
    orderBy: { createdAt: "desc" },
    select: { tipo: true, createdAt: true },
  })

  const pagoC = comanda?.pagamentos.reduce((a, p) => a + paraCentavos(p.valor), 0) ?? 0
  const totalC = comanda ? paraCentavos(comanda.total) : 0

  // Divisão: o cliente vê só nome e valor de cada pessoa, calculados pelo mesmo
  // módulo do PDV (os ids internos do plano não saem daqui).
  const plano = (comanda?.divisao as PlanoDivisao | null) ?? null
  let pessoas: { nome: string; valor: number }[] = []
  if (comanda && plano?.pessoas?.length && plano.pessoas.length > 1 && totalC > 0) {
    const r = calcularDivisao(plano, {
      totalC,
      linhas: comanda.itens.map((i) => ({
        chave: i.id,
        valorC: paraCentavos(i.precoUnit) * i.quantidade - paraCentavos(i.desconto),
        quantidade: i.quantidade,
      })),
    })
    pessoas = plano.pessoas.map((p) => ({ nome: p.nome, valor: (r.porPessoa[p.id] ?? 0) / 100 }))
  }

  return {
    loja: { nome: c.nome, slug: c.slug, logo: c.logo, whatsapp: c.whatsapp, temCardapio: temFeature(c.plan.features, "cardapio") },
    mesa: { nome: mesa.nome, area: mesa.area },
    permite: {
      abrirConta: cfg?.mesaQrAbrirConta ?? true,
      pedido: cfg?.mesaQrPedido ?? true,
      chamarGarcom: cfg?.mesaQrChamarGarcom ?? true,
      pedirConta: cfg?.mesaQrPedirConta ?? true,
    },
    comanda: comanda
      ? {
          numero: comanda.numero,
          abertaEm: comanda.createdAt.toISOString(),
          itens: comanda.itens.map((i) => ({
            id: i.id,
            titulo: i.titulo,
            variacaoNome: i.variacaoNome,
            quantidade: i.quantidade,
            valor: (paraCentavos(i.precoUnit) * i.quantidade - paraCentavos(i.desconto)) / 100,
            observacao: i.observacao,
            estado: i.prontoEm ? "pronto" : i.enviadoEm ? "producao" : "lancado",
          })),
          subtotal: paraNumero(comanda.subtotal),
          desconto: paraNumero(comanda.desconto),
          taxaServico: paraNumero(comanda.taxaServico),
          servicoPercentual: paraNumero(comanda.servicoPercentual),
          total: totalC / 100,
          pago: pagoC / 100,
          saldo: (totalC - pagoC) / 100,
          pessoas,
        }
      : null,
    chamadoPendente: chamado ? { tipo: chamado.tipo, criadoEm: chamado.createdAt.toISOString() } : null,
  }
}

// Chamado do cliente. Tocar de novo em menos de 2 minutos não gera chamado novo
// (evita fila de "garçom!" repetido no painel).
export async function chamarNaMesa(token: string, tipo: TipoChamado, observacao?: string | null) {
  const mesa = await prisma.mesa.findUnique({
    where: { token },
    select: { id: true, comercioId: true, ativa: true, comercio: { select: { status: true, pedidoConfig: { select: { mesaQrChamarGarcom: true, mesaQrPedirConta: true } } } } },
  })
  if (!mesa || !mesa.ativa || mesa.comercio.status !== "ATIVO") throw new ErroVenda("Mesa não encontrada.", 404)
  const cfg = mesa.comercio.pedidoConfig
  const liberado = tipo === "GARCOM" ? cfg?.mesaQrChamarGarcom ?? true : cfg?.mesaQrPedirConta ?? true
  if (!liberado) throw new ErroVenda("A loja desligou este botão.", 403)

  const recente = await prisma.chamadoMesa.findFirst({
    where: { mesaId: mesa.id, tipo, atendidoEm: null, createdAt: { gt: new Date(Date.now() - MIN_ENTRE_CHAMADOS * 60000) } },
    select: { id: true },
  })
  if (recente) return { repetido: true }

  const comanda = await prisma.pedido.findFirst({
    where: { comercioId: mesa.comercioId, status: "ABERTA", mesaId: mesa.id },
    select: { id: true },
  })
  await prisma.chamadoMesa.create({
    data: {
      comercioId: mesa.comercioId,
      mesaId: mesa.id,
      pedidoId: comanda?.id ?? null,
      tipo,
      observacao: observacao?.trim().slice(0, 140) || null,
    },
  })
  return { repetido: false }
}

// ---- chamados no painel/PDV ----------------------------------------------------------

export async function chamadosPendentes(comercioId: string) {
  const chamados = await prisma.chamadoMesa.findMany({
    where: { comercioId, atendidoEm: null },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, tipo: true, observacao: true, createdAt: true, pedidoId: true, mesa: { select: { nome: true, area: true } } },
  })
  return chamados.map((c) => ({
    id: c.id,
    tipo: c.tipo,
    observacao: c.observacao,
    criadoEm: c.createdAt.toISOString(),
    pedidoId: c.pedidoId,
    mesa: c.mesa.nome,
    area: c.mesa.area,
  }))
}

export type ChamadoPainel = Awaited<ReturnType<typeof chamadosPendentes>>[number]

export async function atenderChamado(ctx: ComercioCtx, id: string) {
  const chamado = await prisma.chamadoMesa.findFirst({ where: { id, comercioId: ctx.comercioId, atendidoEm: null }, select: { id: true } })
  if (!chamado) throw new ErroVenda("Chamado não encontrado.", 404)
  await prisma.chamadoMesa.update({ where: { id }, data: { atendidoEm: new Date(), atendidoPorNome: await autorNomeDe(ctx) } })
  return chamadosPendentes(ctx.comercioId)
}
