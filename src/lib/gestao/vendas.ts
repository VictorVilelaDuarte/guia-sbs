import type { OrigemPedido, PedidoStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { ComercioCtx } from "@/lib/comercio-ctx"
import { deCentavos, paraCentavos } from "@/lib/dinheiro"
import { FORMA_PAGAMENTO_KEYS } from "@/lib/hospedagem"
import { centavosDe, precoEfetivo } from "@/lib/pedidos"
import { mudarStatusPedido } from "@/lib/pedidos-historico"
import { normalizarWhatsapp, vincularCliente } from "@/lib/gestao/clientes"
import { temFeature } from "@/lib/plan-features"

// Venda manual (balcão e telefone) — Fase 3 / PR 2 do docs/modulo-gestao.md.
// Reusa o modelo do pedido online: mesmo snapshot de itens, mesma numeração,
// mesmo histórico e mesmo cadastro de clientes. O servidor é a autoridade do
// preço (itens do catálogo) e do total; contas em centavos inteiros.

export class ErroVenda extends Error {
  constructor(message: string, public status = 400) {
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
}

export interface VendaInput {
  origem: Exclude<OrigemPedido, "ONLINE">
  itens: ItemVendaInput[]
  clienteId?: string | null
  clienteNome?: string | null
  clienteWhats?: string | null
  formaPagamento: string
  valorRecebido?: number | null // dinheiro: vira trocoPara
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

export async function registrarVenda(ctx: ComercioCtx, v: VendaInput) {
  const comercioId = ctx.comercioId
  if (!FORMA_PAGAMENTO_KEYS.includes(v.formaPagamento)) throw new ErroVenda("Forma de pagamento inválida.")
  if (v.itens.length === 0) throw new ErroVenda("Adicione ao menos um item.")

  const entrega = v.tipoEntrega === "ENTREGA"
  if (entrega && v.origem !== "TELEFONE") throw new ErroVenda("Entrega só em venda por telefone.")

  // ---- itens: catálogo (preço do banco) ou avulso (preço digitado)
  const ids = [...new Set(v.itens.map((i) => i.produtoId).filter((x): x is string => !!x))]
  const produtos = ids.length
    ? await prisma.produto.findMany({ where: { id: { in: ids }, comercioId }, include: { variacoes: true } })
    : []
  const mapa = new Map(produtos.map((p) => [p.id, p]))

  const snapshots = v.itens.map((item) => {
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 999) {
      throw new ErroVenda("Quantidade inválida.")
    }
    const observacao = item.observacao?.trim() || null
    if (item.produtoId) {
      const p = mapa.get(item.produtoId)
      if (!p) throw new ErroVenda("Um dos itens não existe mais no catálogo.")
      if (p.variacoes.length > 0) {
        const va = p.variacoes.find((x) => x.id === item.variacaoId)
        if (!va) throw new ErroVenda(`Escolha uma opção para "${p.titulo}".`)
        return { produtoId: p.id, titulo: p.titulo, variacaoNome: va.nome, precoC: centavosDe(va.preco), quantidade: item.quantidade, observacao }
      }
      const preco = precoEfetivo(p)
      if (preco == null) throw new ErroVenda(`"${p.titulo}" está sem preço.`)
      return { produtoId: p.id, titulo: p.titulo, variacaoNome: null, precoC: centavosDe(preco), quantidade: item.quantidade, observacao }
    }
    const titulo = item.titulo?.trim()
    if (!titulo) throw new ErroVenda("Informe o nome do item avulso.")
    if (item.precoUnit == null || !(item.precoUnit > 0) || item.precoUnit > 99999) {
      throw new ErroVenda(`Preço inválido para "${titulo}".`)
    }
    return { produtoId: null, titulo, variacaoNome: null, precoC: centavosDe(item.precoUnit), quantidade: item.quantidade, observacao }
  })

  // ---- entrega (telefone): taxa vem da zona da loja
  let zona: { nome: string; taxaC: number } | null = null
  if (entrega) {
    if (!v.endereco?.trim() || !v.numeroEnd?.trim()) throw new ErroVenda("Endereço de entrega incompleto.")
    if (!v.zonaId) throw new ErroVenda("Selecione o bairro de entrega.")
    const z = await prisma.zonaEntrega.findFirst({ where: { id: v.zonaId, comercioId, ativo: true }, select: { nome: true, taxa: true } })
    if (!z) throw new ErroVenda("Bairro de entrega não atendido.")
    zona = { nome: z.nome, taxaC: paraCentavos(z.taxa) }
  }

  const subtotalC = snapshots.reduce((acc, s) => acc + s.precoC * s.quantidade, 0)
  const taxaC = zona?.taxaC ?? 0
  const totalC = subtotalC + taxaC

  let trocoC: number | null = null
  if (v.formaPagamento === "dinheiro" && v.valorRecebido != null) {
    trocoC = centavosDe(v.valorRecebido)
    if (trocoC < totalC) throw new ErroVenda("O valor recebido é menor que o total.")
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

  const autor = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } })
  const autorNome = autor?.name ?? null

  return prisma.$transaction(async (tx) => {
    // Contador de numeração: fica no PedidoConfig, que só existe para quem
    // configurou pedido online. Cria sob demanda (sem ligar o aceite online) —
    // ON CONFLICT DO NOTHING para não abortar a transação em corrida.
    await tx.pedidoConfig.createMany({ data: [{ comercioId, aceitaPedidos: false, formasPagamento: [] }], skipDuplicates: true })
    const upd = await tx.pedidoConfig.update({
      where: { comercioId },
      data: { proximoNumero: { increment: 1 } },
      select: { proximoNumero: true },
    })
    const numero = upd.proximoNumero - 1

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
        formaPagamento: v.formaPagamento,
        trocoPara: trocoC != null ? deCentavos(trocoC) : null,
        observacoes: v.observacoes?.trim() || null,
        subtotal: deCentavos(subtotalC),
        taxaEntrega: deCentavos(taxaC),
        total: deCentavos(totalC),
        itens: {
          create: snapshots.map((s) => ({
            produtoId: s.produtoId,
            titulo: s.titulo,
            variacaoNome: s.variacaoNome,
            precoUnit: deCentavos(s.precoC),
            quantidade: s.quantidade,
            observacao: s.observacao,
          })),
        },
        historico: {
          create: { status, origem: ctx.isAdmin ? "ADMIN" : "LOJA", userId: ctx.userId, autorNome },
        },
      },
      select: { id: true, numero: true, status: true, token: true },
    })
  })
}

// Cancelar venda manual já concluída (registrada por engano). Pedido online e
// vendas ainda na fila seguem a máquina de estados normal do painel.
export async function cancelarVendaManual(ctx: ComercioCtx, pedidoId: string, motivo: string) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    select: { id: true, comercioId: true, origem: true, status: true },
  })
  if (!pedido || pedido.comercioId !== ctx.comercioId) throw new ErroVenda("Venda não encontrada.", 404)
  if (pedido.origem === "ONLINE") throw new ErroVenda("Pedido online não é cancelado por aqui.", 409)
  if (pedido.status !== "CONCLUIDO") throw new ErroVenda("Só vendas concluídas são canceladas por aqui.", 409)
  const autor = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } })
  const r = await mudarStatusPedido({
    pedidoId,
    de: "CONCLUIDO",
    para: "CANCELADO",
    motivo: motivo.trim(),
    origem: ctx.isAdmin ? "ADMIN" : "LOJA",
    userId: ctx.userId,
    autorNome: autor?.name ?? null,
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
  // createdAt é timestamp sem fuso gravado em UTC — mesma conversão dupla do resumo.
  const linhas = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM pedidos
    WHERE "comercioId" = ${comercioId}
      AND ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date = ${opts.dia}::date
    ORDER BY "createdAt" DESC LIMIT 300`
  const ids = linhas.map((l) => l.id)
  if (ids.length === 0) return []
  return prisma.pedido.findMany({
    where: { id: { in: ids }, ...(opts.origem ? { origem: opts.origem } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, numero: true, origem: true, status: true, tipoEntrega: true, clienteNome: true,
      formaPagamento: true, total: true, createdAt: true, criadoPorNome: true, motivoCancelamento: true,
    },
  })
}
