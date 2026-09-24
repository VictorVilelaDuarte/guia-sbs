import type { OrigemPedido, PedidoStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { pode, type ComercioCtx } from "@/lib/comercio-ctx"
import { deCentavos, paraCentavos, paraNumero } from "@/lib/dinheiro"
import { FORMA_MULTIPLAS, FORMA_PAGAMENTO_KEYS } from "@/lib/hospedagem"
import { centavosDe, precoEfetivo } from "@/lib/pedidos"
import { mudarStatusPedido } from "@/lib/pedidos-historico"
import { normalizarWhatsapp, vincularCliente } from "@/lib/gestao/clientes"
import { gruposDosProdutos, resolverComplementos, type EscolhaComplemento, type SnapshotComplemento } from "@/lib/gestao/complementos"
import { calcularTotais, MAX_PERCENTUAL_SERVICO, type DescontoConta } from "@/lib/gestao/totais"
import { temFeature } from "@/lib/plan-features"
import { cadastroDoItem } from "@/lib/produtos-codigos"

// Venda do PDV (balcão e telefone) — Fase 3 do docs/modulo-gestao.md. Reusa o
// modelo do pedido online: mesmo snapshot de itens, mesma numeração, mesmo
// histórico e mesmo cadastro de clientes. O servidor é a autoridade do preço
// (itens do catálogo), dos descontos, da taxa de serviço e do total; contas em
// centavos inteiros. Pagamento em várias formas vai para PedidoPagamento.

export class ErroVenda extends Error {
  constructor(message: string, public status = 400, public extra?: Record<string, unknown>) {
    super(message)
  }
}

export interface ItemVendaInput {
  produtoId?: string | null
  variacaoId?: string | null
  // Item avulso (fora do cardápio): nome e preço digitados.
  titulo?: string | null
  precoUnit?: number | null
  quantidade: number
  observacao?: string | null
  desconto?: number | null // reais, na linha
  complementos?: EscolhaComplemento[] | null
}

export interface PagamentoInput {
  forma: string
  valor: number // reais
  recebido?: number | null // dinheiro: valor entregue pelo cliente
  pagante?: string | null
}

export interface DescontoInput {
  tipo: "valor" | "percentual"
  valor: number // reais ou percentual
}

export interface VendaInput {
  origem: Exclude<OrigemPedido, "ONLINE" | "COMANDA">
  itens: ItemVendaInput[]
  clienteId?: string | null
  clienteNome?: string | null
  clienteWhats?: string | null
  pagamentos: PagamentoInput[]
  desconto?: DescontoInput | null
  cobrarServico?: boolean
  tipoEntrega?: "RETIRADA" | "ENTREGA"
  endereco?: string | null
  numeroEnd?: string | null
  complemento?: string | null
  referencia?: string | null
  zonaId?: string | null
  observacoes?: string | null
  enviarParaFila?: boolean
}

export const NOME_CLIENTE_BALCAO = "Cliente balcão"

// ---- peças compartilhadas com as comandas ---------------------------------------

export interface SnapshotItem {
  produtoId: string | null
  titulo: string
  variacaoNome: string | null
  precoC: number // já com os complementos somados (ver src/lib/gestao/complementos.ts)
  quantidade: number
  observacao: string | null
  descontoC: number
  complementos: SnapshotComplemento[]
  // Snapshot do cadastro (código e custo em reais) — null em item avulso.
  codigo: string | null
  custo: number | null
}

export async function resolverItens(ctx: ComercioCtx, itens: ItemVendaInput[]): Promise<SnapshotItem[]> {
  const ids = [...new Set(itens.map((i) => i.produtoId).filter((x): x is string => !!x))]
  const produtos = ids.length
    ? await prisma.produto.findMany({ where: { id: { in: ids }, comercioId: ctx.comercioId }, include: { variacoes: true } })
    : []
  const mapa = new Map(produtos.map((p) => [p.id, p]))
  const gruposPorProduto = await gruposDosProdutos(ctx.comercioId, ids)

  return itens.map((item) => {
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 999) {
      throw new ErroVenda("Quantidade inválida.")
    }
    const observacao = item.observacao?.trim() || null
    let base: Omit<SnapshotItem, "descontoC" | "complementos">
    if (item.produtoId) {
      const p = mapa.get(item.produtoId)
      if (!p) throw new ErroVenda("Um dos itens não existe mais no catálogo.")
      // Arquivado = fora de linha. "Fora da vitrine" continua vendável aqui (PDV).
      if (p.arquivado) throw new ErroVenda(`"${p.titulo}" foi arquivado e não está mais à venda.`)
      if (p.variacoes.length > 0) {
        const va = p.variacoes.find((x) => x.id === item.variacaoId)
        if (!va) throw new ErroVenda(`Escolha uma opção para "${p.titulo}".`)
        base = { produtoId: p.id, titulo: p.titulo, variacaoNome: va.nome, precoC: centavosDe(va.preco), quantidade: item.quantidade, observacao, ...cadastroDoItem(p, va) }
      } else {
        const preco = precoEfetivo(p)
        if (preco == null) throw new ErroVenda(`"${p.titulo}" está sem preço.`)
        base = { produtoId: p.id, titulo: p.titulo, variacaoNome: null, precoC: centavosDe(preco), quantidade: item.quantidade, observacao, ...cadastroDoItem(p) }
      }
    } else {
      const titulo = item.titulo?.trim()
      if (!titulo) throw new ErroVenda("Informe o nome do item avulso.")
      if (item.precoUnit == null || !(item.precoUnit > 0) || item.precoUnit > 99999) {
        throw new ErroVenda(`Preço inválido para "${titulo}".`)
      }
      base = { produtoId: null, titulo, variacaoNome: null, precoC: centavosDe(item.precoUnit), quantidade: item.quantidade, observacao, codigo: null, custo: null }
    }
    // Complementos entram no preço unitário; o detalhe vira snapshot no item.
    const grupos = item.produtoId ? gruposPorProduto.get(item.produtoId) ?? [] : []
    const { snapshots, extraC } = resolverComplementos(base.titulo, grupos, item.complementos)
    base = { ...base, precoC: base.precoC + extraC }

    const descontoC = item.desconto ? centavosDe(item.desconto) : 0
    if (descontoC < 0 || descontoC > base.precoC * base.quantidade) {
      throw new ErroVenda(`Desconto inválido em "${base.titulo}".`)
    }
    return { ...base, descontoC, complementos: snapshots }
  })
}

export function exigirPermissaoDesconto(ctx: ComercioCtx, algum: boolean) {
  if (algum && !pode(ctx, "vendas:desconto")) {
    throw new ErroVenda("Seu papel neste comércio não permite dar desconto.", 403)
  }
}

export function descontoConta(d: DescontoInput | null | undefined): DescontoConta {
  if (!d || !(d.valor > 0)) return null
  if (d.tipo === "percentual") {
    if (d.valor > 100) throw new ErroVenda("Desconto maior que 100%.")
    return { tipo: "percentual", percentual: Math.round(d.valor * 100) / 100 }
  }
  return { tipo: "valor", valorC: centavosDe(d.valor) }
}

export async function percentualServicoDaLoja(comercioId: string): Promise<number | null> {
  const cfg = await prisma.pedidoConfig.findUnique({ where: { comercioId }, select: { taxaServicoPct: true } })
  const pct = cfg?.taxaServicoPct != null ? paraNumero(cfg.taxaServicoPct) : null
  return pct != null && pct > 0 && pct <= MAX_PERCENTUAL_SERVICO ? pct : null
}

export interface PagamentoValidado {
  forma: string
  valorC: number
  recebidoC: number | null
  pagante: string | null
}

export function validarPagamento(p: PagamentoInput): PagamentoValidado {
  if (!FORMA_PAGAMENTO_KEYS.includes(p.forma)) throw new ErroVenda("Forma de pagamento inválida.")
  const valorC = centavosDe(p.valor)
  if (!(valorC > 0)) throw new ErroVenda("Valor de pagamento inválido.")
  let recebidoC: number | null = null
  if (p.recebido != null) {
    if (p.forma !== "dinheiro") throw new ErroVenda("Valor recebido só em dinheiro.")
    recebidoC = centavosDe(p.recebido)
    if (recebidoC < valorC) throw new ErroVenda("O valor recebido é menor que o valor pago.")
  }
  const pagante = p.pagante?.trim().slice(0, 60) || null
  return { forma: p.forma, valorC, recebidoC, pagante }
}

// Forma resumida gravada no pedido (listas antigas e fila de pedidos).
export function formaResumo(pagamentos: { forma: string }[]): string {
  const formas = [...new Set(pagamentos.map((p) => p.forma))]
  return formas.length === 1 ? formas[0] : FORMA_MULTIPLAS
}

// Próximo número do pedido. O contador fica no PedidoConfig, que só existe para
// quem configurou pedido online: cria sob demanda sem ligar o aceite online —
// ON CONFLICT DO NOTHING para não abortar a transação em corrida.
export async function proximoNumero(tx: Prisma.TransactionClient, comercioId: string): Promise<number> {
  await tx.pedidoConfig.createMany({ data: [{ comercioId, aceitaPedidos: false, formasPagamento: [] }], skipDuplicates: true })
  const upd = await tx.pedidoConfig.update({
    where: { comercioId },
    data: { proximoNumero: { increment: 1 } },
    select: { proximoNumero: true },
  })
  return upd.proximoNumero - 1
}

export async function autorNomeDe(ctx: ComercioCtx): Promise<string | null> {
  const autor = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } })
  return autor?.name ?? null
}

export function origemHistorico(ctx: ComercioCtx) {
  return ctx.isAdmin ? ("ADMIN" as const) : ("LOJA" as const)
}

// ---- venda direta (balcão/telefone) ---------------------------------------------

export async function registrarVenda(ctx: ComercioCtx, v: VendaInput) {
  const comercioId = ctx.comercioId
  if (v.itens.length === 0) throw new ErroVenda("Adicione ao menos um item.")

  const entrega = v.tipoEntrega === "ENTREGA"
  if (entrega && v.origem !== "TELEFONE") throw new ErroVenda("Entrega só em venda por telefone.")

  const snapshots = await resolverItens(ctx, v.itens)
  const desconto = descontoConta(v.desconto)
  exigirPermissaoDesconto(ctx, desconto !== null || snapshots.some((s) => s.descontoC > 0))

  const servicoPct = v.cobrarServico ? await percentualServicoDaLoja(comercioId) : null
  if (v.cobrarServico && servicoPct === null) throw new ErroVenda("A taxa de serviço não está configurada nesta loja.")

  // ---- entrega (telefone): taxa vem da zona da loja
  let zona: { nome: string; taxaC: number } | null = null
  if (entrega) {
    if (!v.endereco?.trim() || !v.numeroEnd?.trim()) throw new ErroVenda("Endereço de entrega incompleto.")
    if (!v.zonaId) throw new ErroVenda("Selecione o bairro de entrega.")
    const z = await prisma.zonaEntrega.findFirst({ where: { id: v.zonaId, comercioId, ativo: true }, select: { nome: true, taxa: true } })
    if (!z) throw new ErroVenda("Bairro de entrega não atendido.")
    zona = { nome: z.nome, taxaC: paraCentavos(z.taxa) }
  }

  const t = calcularTotais({
    linhas: snapshots,
    desconto,
    servicoPercentual: servicoPct,
    entregaC: zona?.taxaC ?? 0,
  })
  if (t.totalC <= 0) throw new ErroVenda("O total da venda precisa ser maior que zero.")

  // ---- pagamentos: fecham exatamente o total
  if (v.pagamentos.length === 0) throw new ErroVenda("Informe o pagamento.")
  const pagamentos = v.pagamentos.map(validarPagamento)
  const pagoC = pagamentos.reduce((a, p) => a + p.valorC, 0)
  if (pagoC !== t.totalC) {
    throw new ErroVenda(pagoC < t.totalC ? "Os pagamentos não cobrem o total da venda." : "Os pagamentos passam do total da venda.")
  }

  // ---- cliente: existente (da loja), informado agora, ou "Cliente balcão"
  let clienteExistente: { id: string; nome: string; whatsapp: string | null } | null = null
  if (v.clienteId) {
    clienteExistente = await prisma.cliente.findFirst({ where: { id: v.clienteId, comercioId }, select: { id: true, nome: true, whatsapp: true } })
    if (!clienteExistente) throw new ErroVenda("Cliente não encontrado.", 404)
  }
  const nomeInformado = v.clienteNome?.trim() || null
  const whatsInformado = normalizarWhatsapp(v.clienteWhats)
  if (whatsInformado && (whatsInformado.length < 10 || whatsInformado.length > 11)) {
    throw new ErroVenda("WhatsApp do cliente inválido — informe o DDD e o número.")
  }
  if (entrega && !clienteExistente && !nomeInformado) throw new ErroVenda("Informe o nome do cliente para a entrega.")

  // Telefone com pedido online ativo pode ir para a fila; senão, nasce concluída.
  const fila = v.origem === "TELEFONE" && !!v.enviarParaFila && temFeature(ctx.features, "pedido_online")
  const status: PedidoStatus = fila ? "AGUARDANDO" : "CONCLUIDO"
  const autorNome = await autorNomeDe(ctx)
  const dinheiroUnico = pagamentos.length === 1 && pagamentos[0].forma === "dinheiro" ? pagamentos[0] : null

  return prisma.$transaction(async (tx) => {
    const numero = await proximoNumero(tx, comercioId)

    // Cliente só é criado/vinculado com WhatsApp (a chave que evita duplicata).
    // Nome sem WhatsApp fica apenas no snapshot do pedido — senão cada venda para
    // "Maria" criaria um cadastro novo.
    let clienteId: string | null = clienteExistente?.id ?? null
    const clienteNome = clienteExistente?.nome ?? nomeInformado ?? NOME_CLIENTE_BALCAO
    const clienteWhats = clienteExistente?.whatsapp ?? whatsInformado ?? ""
    if (!clienteExistente && whatsInformado) {
      clienteId = await vincularCliente(tx, { comercioId, nome: nomeInformado ?? NOME_CLIENTE_BALCAO, whatsapp: whatsInformado })
    }

    return tx.pedido.create({
      data: {
        comercioId,
        numero,
        origem: v.origem,
        criadoPorId: ctx.userId,
        criadoPorNome: autorNome,
        status,
        tipoEntrega: entrega ? "ENTREGA" : "RETIRADA",
        clienteId,
        clienteNome,
        clienteWhats,
        cep: null,
        endereco: entrega ? v.endereco!.trim() : null,
        numeroEnd: entrega ? v.numeroEnd!.trim() : null,
        complemento: entrega ? v.complemento?.trim() || null : null,
        referencia: entrega ? v.referencia?.trim() || null : null,
        bairro: zona?.nome ?? null,
        formaPagamento: formaResumo(pagamentos),
        // Compatibilidade com a fila de pedidos: "troco para" quando é só dinheiro.
        trocoPara: dinheiroUnico?.recebidoC != null ? deCentavos(dinheiroUnico.recebidoC) : null,
        observacoes: v.observacoes?.trim() || null,
        subtotal: deCentavos(t.subtotalC),
        desconto: deCentavos(t.descontoC),
        descontoPercentual: desconto?.tipo === "percentual" ? desconto.percentual : null,
        taxaServico: deCentavos(t.servicoC),
        servicoPercentual: servicoPct,
        taxaEntrega: deCentavos(t.entregaC),
        total: deCentavos(t.totalC),
        fechadaEm: status === "CONCLUIDO" ? new Date() : null,
        itens: {
          create: snapshots.map((s) => ({
            produtoId: s.produtoId,
            titulo: s.titulo,
            variacaoNome: s.variacaoNome,
            precoUnit: deCentavos(s.precoC),
            codigo: s.codigo,
            custoUnit: s.custo != null ? deCentavos(centavosDe(s.custo)) : null,
            quantidade: s.quantidade,
            observacao: s.observacao,
            desconto: deCentavos(s.descontoC),
            complementos: { create: s.complementos.map((c) => ({ grupoNome: c.grupoNome, nome: c.nome, precoUnit: deCentavos(c.precoC), quantidade: c.quantidade })) },
          })),
        },
        pagamentos: {
          create: pagamentos.map((p) => ({
            comercioId,
            forma: p.forma,
            valor: deCentavos(p.valorC),
            recebido: p.recebidoC != null ? deCentavos(p.recebidoC) : null,
            pagante: p.pagante,
            userId: ctx.userId,
            autorNome,
          })),
        },
        historico: {
          create: { status, origem: origemHistorico(ctx), userId: ctx.userId, autorNome },
        },
      },
      select: { id: true, numero: true, status: true, token: true, total: true },
    })
  }).then((p) => ({ ...p, total: paraNumero(p.total) }))
}

// Cancelar venda do PDV já concluída (registrada por engano). Pedido online e
// vendas ainda na fila seguem a máquina de estados normal do painel.
export async function cancelarVendaManual(ctx: ComercioCtx, pedidoId: string, motivo: string) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    select: { id: true, comercioId: true, origem: true, status: true },
  })
  if (!pedido || pedido.comercioId !== ctx.comercioId) throw new ErroVenda("Venda não encontrada.", 404)
  if (pedido.origem === "ONLINE") throw new ErroVenda("Pedido online não é cancelado por aqui.", 409)
  if (pedido.status !== "CONCLUIDO") throw new ErroVenda("Só vendas concluídas são canceladas por aqui.", 409)
  const r = await mudarStatusPedido({
    pedidoId,
    de: "CONCLUIDO",
    para: "CANCELADO",
    motivo: motivo.trim(),
    origem: origemHistorico(ctx),
    userId: ctx.userId,
    autorNome: await autorNomeDe(ctx),
  })
  if (r === "conflito") throw new ErroVenda("Esta venda foi alterada por outra pessoa.", 409)
}

// ---- Lista de vendas de um dia (fuso de São Paulo), todas as origens ----------

const TZ = "America/Sao_Paulo"

export function hojeSP(): string {
  // "AAAA-MM-DD" no fuso da loja (en-CA formata assim).
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}

export async function listarVendasDoDia(comercioId: string, opts: { dia: string; origem?: OrigemPedido | null }) {
  // Data da venda = encerramento (fechadaEm), a mesma regra dos relatórios; venda
  // em aberto (comanda, fila) aparece no dia em que foi criada. Timestamps sem fuso
  // gravados em UTC — mesma conversão dupla do resumo.
  const linhas = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM pedidos
    WHERE "comercioId" = ${comercioId}
      AND (COALESCE("fechadaEm", "createdAt") AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date = ${opts.dia}::date
    ORDER BY COALESCE("fechadaEm", "createdAt") DESC LIMIT 300`
  const ids = linhas.map((l) => l.id)
  if (ids.length === 0) return []
  return prisma.pedido.findMany({
    where: { id: { in: ids }, ...(opts.origem ? { origem: opts.origem } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, numero: true, origem: true, status: true, tipoEntrega: true, clienteNome: true, mesa: true,
      formaPagamento: true, total: true, createdAt: true, fechadaEm: true, criadoPorNome: true, motivoCancelamento: true,
      pagamentos: { where: { estornadoEm: null }, select: { forma: true } },
    },
  })
}
