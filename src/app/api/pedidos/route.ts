import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { temFeature } from "@/lib/plan-features"
import { FORMA_PAGAMENTO_KEYS, formaPagamentoLabel } from "@/lib/hospedagem"
import { calcularSubtotal, calcularTotal, type ItemCalculo } from "@/lib/pedidos"
import { enviarPush, payloadNovoPedido } from "@/lib/push"
import { parseHorarios, getDiaAtual, estaAbertoAgora } from "@/lib/horarios"

// Rota PÚBLICA — sem auth. O servidor é a autoridade: ignora qualquer preço
// vindo do cliente, recarrega itens do banco e recalcula subtotal/total.

const itemSchema = z.object({
  produtoId: z.string(),
  variacaoId: z.string().optional().nullable(),
  quantidade: z.number().int().positive().max(99),
  observacao: z.string().max(280).optional().nullable(),
})

const createSchema = z.object({
  comercioId: z.string(),
  tipoEntrega: z.enum(["ENTREGA", "RETIRADA"]),
  clienteNome: z.string().min(1).max(120),
  clienteWhats: z.string().min(8).max(20),
  // endereço (obrigatório só em ENTREGA)
  cep: z.string().max(9).optional().nullable(),
  endereco: z.string().max(200).optional().nullable(),
  numeroEnd: z.string().max(20).optional().nullable(),
  complemento: z.string().max(120).optional().nullable(),
  referencia: z.string().max(200).optional().nullable(),
  zonaId: z.string().optional().nullable(), // zona de entrega (bairro + taxa)
  formaPagamento: z.enum(FORMA_PAGAMENTO_KEYS as [string, ...string[]]),
  trocoPara: z.number().nonnegative().optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
  itens: z.array(itemSchema).min(1).max(50),
})

function erro(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

// Preço efetivo de um item sem variação — espelha isPromoAtiva do cardápio.
function precoEfetivo(p: {
  preco: number | null
  precoPromo: number | null
  promoFim: Date | null
}): number | null {
  const promoAtiva = p.precoPromo != null && (!p.promoFim || p.promoFim.getTime() > Date.now())
  return promoAtiva ? p.precoPromo : p.preco
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 })
  }
  const d = parsed.data

  const comercio = await prisma.comercio.findUnique({
    where: { id: d.comercioId },
    select: {
      id: true,
      status: true,
      horarios: true,
      plan: { select: { features: true } },
      pedidoConfig: true,
    },
  })
  if (!comercio) return erro("Loja não encontrada.", 404)
  if (comercio.status !== "ATIVO") return erro("Esta loja não está disponível no momento.")
  if (!temFeature(comercio.plan.features, "pedido_online")) {
    return erro("Esta loja não aceita pedidos online.", 403)
  }

  const cfg = comercio.pedidoConfig
  if (!cfg || !cfg.aceitaPedidos) return erro("A loja não está aceitando pedidos agora.")
  if (d.tipoEntrega === "ENTREGA" && !cfg.entregaAtiva) return erro("Entrega indisponível.")
  if (d.tipoEntrega === "RETIRADA" && !cfg.retiradaAtiva) return erro("Retirada indisponível.")

  // Bloqueia pedido fora do horário de funcionamento. Sem horário cadastrado
  // não há como saber → não bloqueia (degrada para o controle manual aceitaPedidos).
  const horarios = parseHorarios(comercio.horarios)
  if (horarios) {
    const hoje = horarios.find((h) => h.dia === getDiaAtual())
    if (hoje && !estaAbertoAgora(hoje, horarios).aberto) {
      return erro("A loja está fechada agora e não está recebendo pedidos.")
    }
  }
  if (!cfg.formasPagamento.includes(d.formaPagamento)) {
    return erro(`Forma de pagamento indisponível: ${formaPagamentoLabel(d.formaPagamento)}.`)
  }

  // Entrega: exige endereço (rua + número) e uma zona de entrega válida da loja.
  // A taxa e o bairro vêm da zona (autoridade) — não do que o cliente enviou.
  let zona: { nome: string; taxa: number } | null = null
  if (d.tipoEntrega === "ENTREGA") {
    if (!d.endereco?.trim() || !d.numeroEnd?.trim()) {
      return erro("Endereço de entrega incompleto.")
    }
    if (!d.zonaId) return erro("Selecione o bairro de entrega.")
    const z = await prisma.zonaEntrega.findFirst({
      where: { id: d.zonaId, comercioId: comercio.id, ativo: true },
      select: { nome: true, taxa: true },
    })
    if (!z) return erro("Não entregamos nessa região.")
    zona = z
  }

  // Recarrega os produtos do banco (autoridade) — só itens disponíveis do cardápio.
  const ids = [...new Set(d.itens.map((i) => i.produtoId))]
  const produtos = await prisma.produto.findMany({
    where: {
      id: { in: ids },
      comercioId: comercio.id,
      disponivel: true,
      categoriaCardapioId: { not: null },
    },
    include: { variacoes: true },
  })
  const mapProd = new Map(produtos.map((p) => [p.id, p]))

  const snapshots: {
    produtoId: string
    titulo: string
    variacaoNome: string | null
    precoUnit: number
    quantidade: number
    observacao: string | null
  }[] = []

  for (const item of d.itens) {
    const p = mapProd.get(item.produtoId)
    if (!p) return erro("Um dos itens não está mais disponível. Revise o carrinho.")

    let precoUnit: number
    let variacaoNome: string | null = null

    if (p.variacoes.length > 0) {
      const v = p.variacoes.find((v) => v.id === item.variacaoId)
      if (!v) return erro(`Escolha uma opção para "${p.titulo}".`)
      precoUnit = v.preco
      variacaoNome = v.nome
    } else {
      const efetivo = precoEfetivo(p)
      if (efetivo == null) return erro(`"${p.titulo}" está sem preço e não pode ser pedido.`)
      precoUnit = efetivo
    }

    snapshots.push({
      produtoId: p.id,
      titulo: p.titulo,
      variacaoNome,
      precoUnit,
      quantidade: item.quantidade,
      observacao: item.observacao?.trim() || null,
    })
  }

  const subtotal = calcularSubtotal(snapshots as ItemCalculo[])
  if (d.tipoEntrega === "ENTREGA" && cfg.pedidoMinimo > 0 && subtotal < cfg.pedidoMinimo) {
    return erro(`Pedido mínimo para entrega: ${formatBRL(cfg.pedidoMinimo)}.`)
  }

  const taxaEntrega = zona ? zona.taxa : 0
  const total = calcularTotal(subtotal, taxaEntrega)

  if (d.formaPagamento === "dinheiro" && d.trocoPara != null && d.trocoPara < total) {
    return erro("O valor do troco é menor que o total do pedido.")
  }

  const entrega = d.tipoEntrega === "ENTREGA"

  const pedido = await prisma.$transaction(async (tx) => {
    // Incremento atômico do contador → `numero` sequencial por comércio.
    const upd = await tx.pedidoConfig.update({
      where: { comercioId: comercio.id },
      data: { proximoNumero: { increment: 1 } },
      select: { proximoNumero: true },
    })
    const numero = upd.proximoNumero - 1

    return tx.pedido.create({
      data: {
        comercioId: comercio.id,
        numero,
        tipoEntrega: d.tipoEntrega,
        clienteNome: d.clienteNome.trim(),
        clienteWhats: d.clienteWhats.replace(/\D/g, ""),
        cep: entrega ? d.cep?.trim() || null : null,
        endereco: entrega ? d.endereco?.trim() || null : null,
        numeroEnd: entrega ? d.numeroEnd?.trim() || null : null,
        bairro: zona ? zona.nome : null,
        complemento: entrega ? d.complemento?.trim() || null : null,
        referencia: entrega ? d.referencia?.trim() || null : null,
        formaPagamento: d.formaPagamento,
        trocoPara: d.formaPagamento === "dinheiro" ? d.trocoPara ?? null : null,
        observacoes: d.observacoes?.trim() || null,
        subtotal,
        taxaEntrega,
        total,
        itens: { create: snapshots },
      },
      select: { token: true, numero: true },
    })
  })

  // Notifica os dispositivos do comerciante (Web Push). Best-effort: uma falha
  // de push nunca pode invalidar um pedido já criado.
  try {
    await enviarPush(
      comercio.id,
      payloadNovoPedido({ numero: pedido.numero, total, tipoEntrega: d.tipoEntrega }),
    )
  } catch {
    // ignora — o pedido já está salvo; o polling do painel ainda o exibe
  }

  return NextResponse.json(pedido, { status: 201 })
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
