import { Prisma, type PedidoStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { pode, type ComercioCtx } from "@/lib/comercio-ctx"
import { deCentavos, paraCentavos, paraNumero } from "@/lib/dinheiro"
import { formaPagamentoLabel } from "@/lib/hospedagem"
import { centavosDe } from "@/lib/pedidos"
import { vincularCliente, normalizarWhatsapp } from "@/lib/gestao/clientes"
import { calcularTotais, type DescontoConta } from "@/lib/gestao/totais"
import {
  autorNomeDe,
  descontoConta,
  ErroVenda,
  exigirPermissaoDesconto,
  formaResumo,
  origemHistorico,
  percentualServicoDaLoja,
  proximoNumero,
  resolverItens,
  validarPagamento,
  type DescontoInput,
  type ItemVendaInput,
  type PagamentoInput,
} from "@/lib/gestao/vendas"

// Comandas do PDV (mesa ou nome) — Fase 3 do docs/modulo-gestao.md. Uma comanda
// é um Pedido com origem COMANDA e status ABERTA: recebe itens em rodadas (que
// podem ir para a produção), pagamentos parciais de cada pessoa e fecha quando o
// saldo zera. Tudo que muda a comanda roda numa transação que trava a linha do
// pedido (SELECT ... FOR UPDATE): dois garçons lançando na mesma mesa, ou um
// pagamento chegando junto com um item novo, não se atropelam.

type Tx = Prisma.TransactionClient

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function exigir(ctx: ComercioCtx, permissao: "vendas:cancelar", mensagem: string) {
  if (!pode(ctx, permissao)) throw new ErroVenda(mensagem, 403)
}

function exigirMotivo(motivo: string | null | undefined): string {
  const m = motivo?.trim() ?? ""
  if (m.length < 3) throw new ErroVenda("Informe o motivo.")
  return m.slice(0, 280)
}

async function travar(tx: Tx, ctx: ComercioCtx, id: string, opts: { aberta?: boolean } = { aberta: true }) {
  const linhas = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM pedidos
    WHERE id = ${id} AND "comercioId" = ${ctx.comercioId} AND origem = 'COMANDA'
    FOR UPDATE`
  if (linhas.length === 0) throw new ErroVenda("Comanda não encontrada.", 404)
  const p = await tx.pedido.findUniqueOrThrow({
    where: { id },
    select: { id: true, numero: true, status: true, mesa: true, clienteNome: true },
  })
  if (opts.aberta !== false && p.status !== "ABERTA") throw new ErroVenda("Esta comanda já foi fechada.", 409)
  return p
}

// Mesa é identificação livre ("4", "Varanda 2"); comparação sem caixa e espaços.
function normalizarMesa(mesa: string | null | undefined): string | null {
  const m = mesa?.trim().replace(/\s+/g, " ").slice(0, 20)
  return m ? m : null
}

async function travarMesa(tx: Tx, comercioId: string, mesa: string) {
  // Lock de transação por (loja, mesa): duas pessoas abrindo a mesma mesa ao
  // mesmo tempo não criam duas comandas.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${comercioId}:${mesa.toLowerCase()}`}))`
}

// Mesa cadastrada com este nome (o QR dela passa a mostrar a conta).
async function mesaPorNome(tx: Tx, comercioId: string, nome: string | null | undefined) {
  if (!nome) return null
  return tx.mesa.findFirst({ where: { comercioId, nome: { equals: nome, mode: "insensitive" } }, select: { id: true } })
}

async function comandaAbertaNaMesa(tx: Tx, comercioId: string, mesa: string, exceto?: string) {
  return tx.pedido.findFirst({
    where: {
      comercioId,
      origem: "COMANDA",
      status: "ABERTA",
      mesa: { equals: mesa, mode: "insensitive" },
      ...(exceto ? { id: { not: exceto } } : {}),
    },
    select: { id: true, numero: true },
  })
}

async function registrar(
  tx: Tx,
  ctx: ComercioCtx,
  autorNome: string | null,
  pedidoId: string,
  status: PedidoStatus,
  descricao: string | null,
  motivo: string | null = null,
) {
  await tx.pedidoHistorico.create({
    data: { pedidoId, status, origem: origemHistorico(ctx), userId: ctx.userId, autorNome, descricao, motivo },
  })
}

// Recalcula e grava os totais a partir dos itens. Nunca deixa o total ficar
// abaixo do que já foi pago (item removido depois do pagamento).
async function recalcular(tx: Tx, pedidoId: string) {
  const p = await tx.pedido.findUniqueOrThrow({
    where: { id: pedidoId },
    select: {
      desconto: true,
      descontoPercentual: true,
      servicoPercentual: true,
      // Item pedido pelo cliente no QR só entra no total depois de aprovado.
      itens: { where: { OR: [{ solicitadoEm: null }, { aprovadoEm: { not: null } }] }, select: { precoUnit: true, quantidade: true, desconto: true } },
      pagamentos: { where: { estornadoEm: null }, select: { valor: true } },
    },
  })
  const desconto: DescontoConta =
    p.descontoPercentual != null
      ? { tipo: "percentual", percentual: paraNumero(p.descontoPercentual) }
      : paraCentavos(p.desconto) > 0
        ? { tipo: "valor", valorC: paraCentavos(p.desconto) }
        : null
  const t = calcularTotais({
    linhas: p.itens.map((i) => ({ precoC: paraCentavos(i.precoUnit), quantidade: i.quantidade, descontoC: paraCentavos(i.desconto) })),
    desconto,
    servicoPercentual: p.servicoPercentual != null ? paraNumero(p.servicoPercentual) : null,
  })
  const pagoC = p.pagamentos.reduce((a, x) => a + paraCentavos(x.valor), 0)
  if (t.totalC < pagoC) {
    throw new ErroVenda(`O total ficaria menor que o já pago (${brl(pagoC)}). Estorne um pagamento antes.`, 409)
  }
  await tx.pedido.update({
    where: { id: pedidoId },
    data: {
      subtotal: deCentavos(t.subtotalC),
      desconto: deCentavos(t.descontoC),
      taxaServico: deCentavos(t.servicoC),
      total: deCentavos(t.totalC),
    },
  })
  return { ...t, pagoC, saldoC: t.totalC - pagoC, itens: p.itens.length }
}

// ---- abrir ------------------------------------------------------------------------

export async function abrirComanda(
  ctx: ComercioCtx,
  input: { mesa?: string | null; nome?: string | null; clienteId?: string | null; clienteWhats?: string | null; cobrarServico?: boolean },
) {
  const comercioId = ctx.comercioId
  const mesa = normalizarMesa(input.mesa)
  const nome = input.nome?.trim().slice(0, 60) || null
  if (!mesa && !nome) throw new ErroVenda("Informe a mesa ou o nome da comanda.")

  let cliente: { id: string; nome: string; whatsapp: string | null } | null = null
  if (input.clienteId) {
    cliente = await prisma.cliente.findFirst({ where: { id: input.clienteId, comercioId }, select: { id: true, nome: true, whatsapp: true } })
    if (!cliente) throw new ErroVenda("Cliente não encontrado.", 404)
  }
  const whats = normalizarWhatsapp(input.clienteWhats)
  if (whats && (whats.length < 10 || whats.length > 11)) throw new ErroVenda("WhatsApp do cliente inválido — informe o DDD e o número.")

  const servicoPct = input.cobrarServico === false ? null : await percentualServicoDaLoja(comercioId)
  const autorNome = await autorNomeDe(ctx)

  const id = await prisma.$transaction(async (tx) => {
    if (mesa) {
      await travarMesa(tx, comercioId, mesa)
      const existente = await comandaAbertaNaMesa(tx, comercioId, mesa)
      if (existente) {
        throw new ErroVenda(`A mesa ${mesa} já tem a comanda #${existente.numero} aberta.`, 409, { comandaId: existente.id })
      }
    }
    const numero = await proximoNumero(tx, comercioId)
    // Mesa do cadastro (QR): a conta passa a aparecer no celular de quem escanear.
    const cadastro = await mesaPorNome(tx, comercioId, mesa)
    let clienteId = cliente?.id ?? null
    if (!cliente && whats) clienteId = await vincularCliente(tx, { comercioId, nome: nome ?? `Mesa ${mesa}`, whatsapp: whats })
    const p = await tx.pedido.create({
      data: {
        comercioId,
        numero,
        origem: "COMANDA",
        status: "ABERTA",
        tipoEntrega: "RETIRADA",
        mesa,
        mesaId: cadastro?.id ?? null,
        clienteId,
        clienteNome: cliente?.nome ?? nome ?? `Mesa ${mesa}`,
        clienteWhats: cliente?.whatsapp ?? whats ?? "",
        formaPagamento: "",
        subtotal: 0,
        total: 0,
        servicoPercentual: servicoPct,
        criadoPorId: ctx.userId,
        criadoPorNome: autorNome,
        historico: { create: { status: "ABERTA", origem: origemHistorico(ctx), userId: ctx.userId, autorNome } },
      },
      select: { id: true },
    })
    return p.id
  })
  return detalheComanda(comercioId, id)
}

// ---- itens --------------------------------------------------------------------------

export async function lancarItens(ctx: ComercioCtx, id: string, itens: ItemVendaInput[], enviar: boolean) {
  if (itens.length === 0) throw new ErroVenda("Adicione ao menos um item.")
  const snapshots = await resolverItens(ctx, itens)
  exigirPermissaoDesconto(ctx, snapshots.some((s) => s.descontoC > 0))
  const autorNome = await autorNomeDe(ctx)

  await prisma.$transaction(async (tx) => {
    const p = await travar(tx, ctx, id)
    let rodada: number | null = null
    if (enviar) {
      const max = await tx.pedidoItem.aggregate({ where: { pedidoId: id }, _max: { rodada: true } })
      rodada = (max._max.rodada ?? 0) + 1
    }
    const agora = new Date()
    await tx.pedidoItem.createMany({
      data: snapshots.map((s) => ({
        pedidoId: id,
        produtoId: s.produtoId,
        titulo: s.titulo,
        variacaoNome: s.variacaoNome,
        precoUnit: deCentavos(s.precoC),
        quantidade: s.quantidade,
        observacao: s.observacao,
        desconto: deCentavos(s.descontoC),
        rodada,
        enviadoEm: enviar ? agora : null,
      })),
    })
    await recalcular(tx, id)
    const qtd = snapshots.reduce((a, s) => a + s.quantidade, 0)
    await registrar(tx, ctx, autorNome, id, p.status, `Lançou ${qtd} item(ns)${rodada ? ` e enviou para a produção (rodada ${rodada})` : ""}`)
  })
  return detalheComanda(ctx.comercioId, id)
}

export async function enviarParaProducao(ctx: ComercioCtx, id: string) {
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    const p = await travar(tx, ctx, id)
    const max = await tx.pedidoItem.aggregate({ where: { pedidoId: id }, _max: { rodada: true } })
    const rodada = (max._max.rodada ?? 0) + 1
    const r = await tx.pedidoItem.updateMany({
      where: { pedidoId: id, enviadoEm: null, OR: [{ solicitadoEm: null }, { aprovadoEm: { not: null } }] },
      data: { rodada, enviadoEm: new Date() },
    })
    if (r.count === 0) throw new ErroVenda("Não há itens novos para enviar.", 409)
    await registrar(tx, ctx, autorNome, id, p.status, `Enviou ${r.count} item(ns) para a produção (rodada ${rodada})`)
  })
  return detalheComanda(ctx.comercioId, id)
}

export async function alterarItem(
  ctx: ComercioCtx,
  id: string,
  itemId: string,
  input: { quantidade?: number; observacao?: string | null; desconto?: number | null; motivo?: string | null },
) {
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    const p = await travar(tx, ctx, id)
    const item = await tx.pedidoItem.findFirst({ where: { id: itemId, pedidoId: id } })
    if (!item) throw new ErroVenda("Item não encontrado.", 404)
    const data: Prisma.PedidoItemUpdateInput = {}
    const precoC = paraCentavos(item.precoUnit)
    let quantidade = item.quantidade

    if (input.quantidade !== undefined && input.quantidade !== item.quantidade) {
      if (!Number.isInteger(input.quantidade) || input.quantidade < 1 || input.quantidade > 999) throw new ErroVenda("Quantidade inválida.")
      if (input.quantidade < item.quantidade && item.enviadoEm) {
        exigir(ctx, "vendas:cancelar", "Só dono ou gerente reduz item já enviado para a produção.")
        const motivo = exigirMotivo(input.motivo)
        await registrar(tx, ctx, autorNome, id, p.status, `Reduziu ${item.titulo} de ${item.quantidade} para ${input.quantidade}`, motivo)
      }
      quantidade = input.quantidade
      data.quantidade = quantidade
    }
    if (input.observacao !== undefined) data.observacao = input.observacao?.trim().slice(0, 280) || null

    let descontoC = paraCentavos(item.desconto)
    if (input.desconto !== undefined) {
      descontoC = input.desconto ? centavosDe(input.desconto) : 0
      if (descontoC > 0 && descontoC !== paraCentavos(item.desconto)) exigirPermissaoDesconto(ctx, true)
    }
    if (descontoC < 0 || descontoC > precoC * quantidade) throw new ErroVenda(`Desconto inválido em "${item.titulo}".`)
    data.desconto = deCentavos(descontoC)

    await tx.pedidoItem.update({ where: { id: itemId }, data })
    await recalcular(tx, id)
  })
  return detalheComanda(ctx.comercioId, id)
}

export async function removerItem(ctx: ComercioCtx, id: string, itemId: string, motivo?: string | null) {
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    const p = await travar(tx, ctx, id)
    const item = await tx.pedidoItem.findFirst({ where: { id: itemId, pedidoId: id } })
    if (!item) throw new ErroVenda("Item não encontrado.", 404)
    if (item.enviadoEm) {
      exigir(ctx, "vendas:cancelar", "Só dono ou gerente tira item já enviado para a produção.")
      const m = exigirMotivo(motivo)
      await registrar(tx, ctx, autorNome, id, p.status, `Removeu ${item.quantidade}× ${item.titulo}${item.variacaoNome ? ` (${item.variacaoNome})` : ""}`, m)
    }
    await tx.pedidoItem.delete({ where: { id: itemId } })
    await recalcular(tx, id)
  })
  return detalheComanda(ctx.comercioId, id)
}

// ---- dados da comanda (mesa, nome, desconto, serviço, divisão) -----------------------

export async function atualizarComanda(
  ctx: ComercioCtx,
  id: string,
  input: {
    mesa?: string | null
    nome?: string | null
    desconto?: DescontoInput | null
    cobrarServico?: boolean
    divisao?: Prisma.InputJsonValue | null
  },
) {
  const comercioId = ctx.comercioId
  const autorNome = await autorNomeDe(ctx)
  const servicoPct = input.cobrarServico ? await percentualServicoDaLoja(comercioId) : null
  if (input.cobrarServico && servicoPct === null) throw new ErroVenda("A taxa de serviço não está configurada nesta loja.")

  await prisma.$transaction(async (tx) => {
    const p = await travar(tx, ctx, id)
    const data: Prisma.PedidoUpdateInput = {}
    let recalc = false

    if (input.mesa !== undefined) {
      const mesa = normalizarMesa(input.mesa)
      if ((mesa ?? "").toLowerCase() !== (p.mesa ?? "").toLowerCase()) {
        if (mesa) {
          await travarMesa(tx, comercioId, mesa)
          const outra = await comandaAbertaNaMesa(tx, comercioId, mesa, id)
          if (outra) {
            throw new ErroVenda(`A mesa ${mesa} já tem a comanda #${outra.numero} aberta — junte as comandas.`, 409, { comandaId: outra.id })
          }
        }
        const cadastro = mesa ? await mesaPorNome(tx, comercioId, mesa) : null
        data.mesa = mesa
        // Transferiu de mesa: o QR da mesa nova passa a mostrar esta conta, e o da antiga para.
        data.mesaRef = cadastro ? { connect: { id: cadastro.id } } : { disconnect: true }
        await registrar(tx, ctx, autorNome, id, p.status, p.mesa ? `Transferida da mesa ${p.mesa} para ${mesa ? `a mesa ${mesa}` : "sem mesa"}` : `Levada para a mesa ${mesa}`)
      }
    }
    if (input.nome !== undefined) {
      const nome = input.nome?.trim().slice(0, 60)
      if (nome) data.clienteNome = nome
    }
    if (input.desconto !== undefined) {
      const d = descontoConta(input.desconto)
      exigirPermissaoDesconto(ctx, d !== null)
      data.descontoPercentual = d?.tipo === "percentual" ? d.percentual : null
      data.desconto = d?.tipo === "valor" ? deCentavos(d.valorC) : 0
      recalc = true
    }
    if (input.cobrarServico !== undefined) {
      data.servicoPercentual = servicoPct
      recalc = true
    }
    if (input.divisao !== undefined) data.divisao = input.divisao === null ? Prisma.DbNull : input.divisao

    if (Object.keys(data).length > 0) await tx.pedido.update({ where: { id }, data })
    if (recalc) await recalcular(tx, id)
  })
  return detalheComanda(comercioId, id)
}

// ---- pagamentos e fechamento ------------------------------------------------------

async function fecharTx(tx: Tx, ctx: ComercioCtx, autorNome: string | null, id: string) {
  const t = await recalcular(tx, id)
  if (t.itens === 0) throw new ErroVenda("Comanda sem itens — cancele em vez de fechar.", 409)
  // Pedido feito pelo QR não pode ficar órfão: o cliente acha que pediu.
  const pendentes = await tx.pedidoItem.count({ where: { pedidoId: id, solicitadoEm: { not: null }, aprovadoEm: null } })
  if (pendentes > 0) throw new ErroVenda("Confirme ou recuse o pedido feito pelo cliente antes de fechar.", 409)
  if (t.saldoC > 0) throw new ErroVenda(`Falta receber ${brl(t.saldoC)}.`, 409)
  const pagamentos = await tx.pedidoPagamento.findMany({ where: { pedidoId: id, estornadoEm: null }, select: { forma: true } })
  await tx.pedido.update({
    where: { id },
    data: { status: "CONCLUIDO", formaPagamento: formaResumo(pagamentos), fechadaEm: new Date() },
  })
  await registrar(tx, ctx, autorNome, id, "CONCLUIDO", null)
}

export async function registrarPagamentoComanda(ctx: ComercioCtx, id: string, input: PagamentoInput, fechar: boolean) {
  const pg = validarPagamento(input)
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    const p = await travar(tx, ctx, id)
    const t = await recalcular(tx, id)
    if (pg.valorC > t.saldoC) {
      throw new ErroVenda(t.saldoC === 0 ? "Esta comanda já está paga." : `Valor maior que o saldo da comanda (${brl(t.saldoC)}).`)
    }
    await tx.pedidoPagamento.create({
      data: {
        pedidoId: id,
        comercioId: ctx.comercioId,
        forma: pg.forma,
        valor: deCentavos(pg.valorC),
        recebido: pg.recebidoC != null ? deCentavos(pg.recebidoC) : null,
        pagante: pg.pagante,
        userId: ctx.userId,
        autorNome,
      },
    })
    await registrar(tx, ctx, autorNome, id, p.status, `Pagamento de ${brl(pg.valorC)} (${formaPagamentoLabel(pg.forma)})${pg.pagante ? ` · ${pg.pagante}` : ""}`)
    if (fechar && pg.valorC === t.saldoC) await fecharTx(tx, ctx, autorNome, id)
  })
  return detalheComanda(ctx.comercioId, id)
}

export async function estornarPagamento(ctx: ComercioCtx, id: string, pagamentoId: string, motivo: string | null | undefined) {
  exigir(ctx, "vendas:cancelar", "Só dono ou gerente estorna pagamento.")
  const m = exigirMotivo(motivo)
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    const p = await travar(tx, ctx, id)
    const pg = await tx.pedidoPagamento.findFirst({ where: { id: pagamentoId, pedidoId: id, estornadoEm: null } })
    if (!pg) throw new ErroVenda("Pagamento não encontrado.", 404)
    await tx.pedidoPagamento.update({
      where: { id: pagamentoId },
      data: { estornadoEm: new Date(), estornadoPorNome: autorNome, motivoEstorno: m },
    })
    await registrar(tx, ctx, autorNome, id, p.status, `Estornou pagamento de ${brl(paraCentavos(pg.valor))} (${formaPagamentoLabel(pg.forma)})`, m)
  })
  return detalheComanda(ctx.comercioId, id)
}

export async function fecharComanda(ctx: ComercioCtx, id: string) {
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    await travar(tx, ctx, id)
    await fecharTx(tx, ctx, autorNome, id)
  })
  return detalheComanda(ctx.comercioId, id)
}

export async function cancelarComanda(ctx: ComercioCtx, id: string, motivo: string | null | undefined) {
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    await travar(tx, ctx, id)
    const [itens, pagos] = await Promise.all([
      tx.pedidoItem.count({ where: { pedidoId: id } }),
      tx.pedidoPagamento.count({ where: { pedidoId: id, estornadoEm: null } }),
    ])
    if (pagos > 0) throw new ErroVenda("Estorne os pagamentos antes de cancelar a comanda.", 409)
    // Comanda vazia (aberta por engano) qualquer um cancela; com itens, só dono/gerente.
    let m = motivo?.trim() || "Aberta por engano"
    if (itens > 0) {
      exigir(ctx, "vendas:cancelar", "Só dono ou gerente cancela comanda com itens.")
      m = exigirMotivo(motivo)
    }
    await tx.pedido.update({ where: { id }, data: { status: "CANCELADO", motivoCancelamento: m, fechadaEm: new Date() } })
    await registrar(tx, ctx, autorNome, id, "CANCELADO", null, m)
  })
  return detalheComanda(ctx.comercioId, id)
}

// Junta a comanda `origemId` na `destinoId`: itens e pagamentos passam para o
// destino; a origem fica CANCELADA com o motivo e o vínculo (juntadaEmId).
export async function juntarComandas(ctx: ComercioCtx, destinoId: string, origemId: string) {
  if (destinoId === origemId) throw new ErroVenda("Escolha outra comanda para juntar.")
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    // Trava sempre na mesma ordem (por id) para não haver deadlock entre junções cruzadas.
    const [a, b] = [destinoId, origemId].sort()
    const travadas = new Map([
      [a, await travar(tx, ctx, a)],
      [b, await travar(tx, ctx, b)],
    ])
    const destino = travadas.get(destinoId)!
    const origem = travadas.get(origemId)!
    await tx.pedidoItem.updateMany({ where: { pedidoId: origemId }, data: { pedidoId: destinoId } })
    await tx.pedidoPagamento.updateMany({ where: { pedidoId: origemId }, data: { pedidoId: destinoId } })
    const motivo = `Juntada à comanda #${destino.numero}`
    await tx.pedido.update({
      where: { id: origemId },
      data: { status: "CANCELADO", motivoCancelamento: motivo, juntadaEmId: destinoId, subtotal: 0, desconto: 0, taxaServico: 0, total: 0, fechadaEm: new Date() },
    })
    await registrar(tx, ctx, autorNome, origemId, "CANCELADO", null, motivo)
    await registrar(tx, ctx, autorNome, destinoId, destino.status, `Recebeu a comanda #${origem.numero}${origem.mesa ? ` (mesa ${origem.mesa})` : ""}`)
    await recalcular(tx, destinoId)
  })
  return detalheComanda(ctx.comercioId, destinoId)
}

// ---- leitura ------------------------------------------------------------------------

export async function detalheComanda(comercioId: string, id: string) {
  const p = await prisma.pedido.findFirst({
    where: { id, comercioId, origem: "COMANDA" },
    select: {
      id: true, numero: true, status: true, mesa: true, clienteNome: true, clienteId: true, createdAt: true, fechadaEm: true,
      criadoPorNome: true, motivoCancelamento: true, juntadaEmId: true,
      subtotal: true, desconto: true, descontoPercentual: true, taxaServico: true, servicoPercentual: true, total: true, divisao: true,
      itens: {
        orderBy: { createdAt: "asc" },
        select: { id: true, produtoId: true, titulo: true, variacaoNome: true, precoUnit: true, quantidade: true, observacao: true, desconto: true, rodada: true, enviadoEm: true, prontoEm: true, solicitadoPor: true, solicitadoEm: true, aprovadoEm: true },
      },
      pagamentos: {
        orderBy: { createdAt: "asc" },
        select: { id: true, forma: true, valor: true, recebido: true, pagante: true, autorNome: true, createdAt: true, estornadoEm: true, motivoEstorno: true },
      },
      historico: {
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, autorNome: true, motivo: true, descricao: true, createdAt: true },
      },
    },
  })
  if (!p) throw new ErroVenda("Comanda não encontrada.", 404)
  const pagoC = p.pagamentos.filter((x) => !x.estornadoEm).reduce((a, x) => a + paraCentavos(x.valor), 0)
  const totalC = paraCentavos(p.total)
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    fechadaEm: p.fechadaEm?.toISOString() ?? null,
    subtotal: paraNumero(p.subtotal),
    desconto: paraNumero(p.desconto),
    descontoPercentual: paraNumero(p.descontoPercentual),
    taxaServico: paraNumero(p.taxaServico),
    servicoPercentual: paraNumero(p.servicoPercentual),
    total: paraNumero(p.total),
    pago: pagoC / 100,
    saldo: (totalC - pagoC) / 100,
    itens: p.itens.map((i) => ({
      ...i,
      precoUnit: paraNumero(i.precoUnit),
      desconto: paraNumero(i.desconto),
      enviadoEm: i.enviadoEm?.toISOString() ?? null,
      prontoEm: i.prontoEm?.toISOString() ?? null,
      solicitadoEm: i.solicitadoEm?.toISOString() ?? null,
      aprovadoEm: i.aprovadoEm?.toISOString() ?? null,
    })),
    pagamentos: p.pagamentos.map((x) => ({
      ...x,
      valor: paraNumero(x.valor),
      recebido: paraNumero(x.recebido),
      createdAt: x.createdAt.toISOString(),
      estornadoEm: x.estornadoEm?.toISOString() ?? null,
    })),
    historico: p.historico.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
  }
}

export type ComandaDetalhe = Awaited<ReturnType<typeof detalheComanda>>

export async function listarComandasAbertas(comercioId: string) {
  const comandas = await prisma.pedido.findMany({
    where: { comercioId, origem: "COMANDA", status: "ABERTA" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, numero: true, mesa: true, clienteNome: true, total: true, createdAt: true,
      itens: { select: { quantidade: true, enviadoEm: true, prontoEm: true, solicitadoEm: true, aprovadoEm: true } },
      pagamentos: { where: { estornadoEm: null }, select: { valor: true } },
    },
  })
  return comandas.map((c) => {
    const pagoC = c.pagamentos.reduce((a, x) => a + paraCentavos(x.valor), 0)
    return {
      id: c.id,
      numero: c.numero,
      mesa: c.mesa,
      clienteNome: c.clienteNome,
      total: paraNumero(c.total),
      pago: pagoC / 100,
      createdAt: c.createdAt.toISOString(),
      itens: c.itens.reduce((a, i) => a + i.quantidade, 0),
      naoEnviados: c.itens.filter((i) => !i.enviadoEm && !(i.solicitadoEm && !i.aprovadoEm)).length,
      naProducao: c.itens.filter((i) => i.enviadoEm && !i.prontoEm).length,
      aguardandoAprovacao: c.itens.filter((i) => i.solicitadoEm && !i.aprovadoEm).length,
    }
  })
}

export type ComandaResumo = Awaited<ReturnType<typeof listarComandasAbertas>>[number]

// ---- produção -----------------------------------------------------------------------

export async function listarProducao(comercioId: string) {
  const itens = await prisma.pedidoItem.findMany({
    where: {
      enviadoEm: { not: null },
      prontoEm: null,
      pedido: { comercioId, status: { notIn: ["CANCELADO", "RECUSADO"] } },
    },
    orderBy: { enviadoEm: "asc" },
    take: 300,
    select: {
      id: true, titulo: true, variacaoNome: true, quantidade: true, observacao: true, rodada: true, enviadoEm: true,
      pedido: { select: { id: true, numero: true, mesa: true, clienteNome: true } },
    },
  })
  const grupos = new Map<string, {
    pedidoId: string; numero: number; mesa: string | null; clienteNome: string; rodada: number; enviadoEm: string
    itens: { id: string; titulo: string; variacaoNome: string | null; quantidade: number; observacao: string | null }[]
  }>()
  for (const i of itens) {
    const chave = `${i.pedido.id}:${i.rodada}`
    let g = grupos.get(chave)
    if (!g) {
      g = { pedidoId: i.pedido.id, numero: i.pedido.numero, mesa: i.pedido.mesa, clienteNome: i.pedido.clienteNome, rodada: i.rodada ?? 0, enviadoEm: i.enviadoEm!.toISOString(), itens: [] }
      grupos.set(chave, g)
    }
    g.itens.push({ id: i.id, titulo: i.titulo, variacaoNome: i.variacaoNome, quantidade: i.quantidade, observacao: i.observacao })
  }
  return [...grupos.values()]
}

export type RodadaProducao = Awaited<ReturnType<typeof listarProducao>>[number]

export async function marcarRodadaPronta(ctx: ComercioCtx, pedidoId: string, rodada: number) {
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    const p = await tx.pedido.findFirst({ where: { id: pedidoId, comercioId: ctx.comercioId }, select: { status: true } })
    if (!p) throw new ErroVenda("Comanda não encontrada.", 404)
    const r = await tx.pedidoItem.updateMany({ where: { pedidoId, rodada, enviadoEm: { not: null }, prontoEm: null }, data: { prontoEm: new Date() } })
    if (r.count === 0) throw new ErroVenda("Esta rodada já foi marcada como pronta.", 409)
    await registrar(tx, ctx, autorNome, pedidoId, p.status, `Rodada ${rodada} pronta`)
  })
}

// ---- pedidos feitos pelo cliente no QR da mesa ----------------------------------------

// Aprova o que o cliente pediu: o item entra no total e vai DIRETO para a
// produção (confirmar no PDV já é o "manda fazer" — o atendente não precisa
// clicar em enviar depois). Confirmar item a item gera uma rodada por vez;
// "confirmar tudo" manda todos numa rodada só.
export async function aprovarSolicitacao(ctx: ComercioCtx, id: string, itemId: string | null) {
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    const p = await travar(tx, ctx, id)
    const max = await tx.pedidoItem.aggregate({ where: { pedidoId: id }, _max: { rodada: true } })
    const rodada = (max._max.rodada ?? 0) + 1
    const r = await tx.pedidoItem.updateMany({
      where: { pedidoId: id, solicitadoEm: { not: null }, aprovadoEm: null, ...(itemId ? { id: itemId } : {}) },
      data: { aprovadoEm: new Date(), rodada, enviadoEm: new Date() },
    })
    if (r.count === 0) throw new ErroVenda("Nada para aprovar — o pedido já foi tratado.", 409)
    await recalcular(tx, id)
    await registrar(tx, ctx, autorNome, id, p.status, `Confirmou ${r.count} item(ns) do cliente e enviou para a produção (rodada ${rodada})`)
  })
  return detalheComanda(ctx.comercioId, id)
}

// Recusa: o item sai da comanda (nunca entrou no total) e fica no histórico.
export async function recusarSolicitacao(ctx: ComercioCtx, id: string, itemId: string, motivo?: string | null) {
  const autorNome = await autorNomeDe(ctx)
  await prisma.$transaction(async (tx) => {
    const p = await travar(tx, ctx, id)
    const item = await tx.pedidoItem.findFirst({ where: { id: itemId, pedidoId: id, solicitadoEm: { not: null }, aprovadoEm: null } })
    if (!item) throw new ErroVenda("Pedido do cliente não encontrado.", 404)
    await tx.pedidoItem.delete({ where: { id: itemId } })
    await registrar(tx, ctx, autorNome, id, p.status, `Recusou ${item.quantidade}× ${item.titulo} pedido pelo cliente`, motivo?.trim().slice(0, 280) || null)
  })
  return detalheComanda(ctx.comercioId, id)
}

// Solicitações esperando o atendente, para o aviso do PDV.
export async function solicitacoesPendentes(comercioId: string) {
  const itens = await prisma.pedidoItem.findMany({
    where: { solicitadoEm: { not: null }, aprovadoEm: null, pedido: { comercioId, status: "ABERTA" } },
    orderBy: { solicitadoEm: "asc" },
    take: 100,
    select: { id: true, titulo: true, quantidade: true, solicitadoPor: true, solicitadoEm: true, pedido: { select: { id: true, numero: true, mesa: true, clienteNome: true } } },
  })
  const porComanda = new Map<string, { pedidoId: string; numero: number; mesa: string | null; clienteNome: string; desde: string; itens: number; pedidoPor: string | null }>()
  for (const i of itens) {
    const atual = porComanda.get(i.pedido.id)
    if (atual) atual.itens += i.quantidade
    else
      porComanda.set(i.pedido.id, {
        pedidoId: i.pedido.id,
        numero: i.pedido.numero,
        mesa: i.pedido.mesa,
        clienteNome: i.pedido.clienteNome,
        desde: i.solicitadoEm!.toISOString(),
        itens: i.quantidade,
        pedidoPor: i.solicitadoPor,
      })
  }
  return [...porComanda.values()]
}

export type SolicitacaoPainel = Awaited<ReturnType<typeof solicitacoesPendentes>>[number]
