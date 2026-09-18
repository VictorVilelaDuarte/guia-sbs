/**
 * Loja de DEMONSTRAÇÃO — dados fictícios para apresentar o sistema
 *
 * Cria um restaurante fictício ("Cantinho da Serra") com cardápio, equipe,
 * clientes, três semanas de vendas (balcão, telefone, comandas e pedido online),
 * comandas abertas com itens na produção, pedidos na fila e visitas no analytics.
 * Serve para mostrar o painel, o PDV e os relatórios com a tela cheia de vida.
 *
 * Nada aqui é dado real: nomes de loja, pessoas e telefones são inventados.
 *
 *   npx tsx prisma/seed-demo.ts           # cria (recria se já existir)
 *   npx tsx prisma/seed-demo.ts --limpar  # apaga a loja e os usuários da demo
 *
 * Acesso: demo-dono@guiasbs.local / demo123 (mesma senha para os demais papéis).
 */

import { Prisma, PrismaClient } from "@prisma/client"
import { novoToken } from "../src/lib/gestao/mesas-token"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const SENHA = "demo123"
const SUFIXO = "@guiasbs.local"
const NOME_LOJA = "Cantinho da Serra"
const DIAS = 21 // histórico de vendas
const TZ = "America/Sao_Paulo"

// Sorteio determinístico: rodar duas vezes gera a mesma demo.
let semente = 20260916
const rnd = () => {
  semente = (semente * 1664525 + 1013904223) % 4294967296
  return semente / 4294967296
}
const entre = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
const escolher = <T>(lista: readonly T[]): T => lista[Math.floor(rnd() * lista.length)]
const chance = (p: number) => rnd() < p

// Meia-noite (SP) de "n dias atrás", em UTC — o fuso local é UTC-3 o ano todo.
const diaBase = (n: number) => {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  return new Date(new Date(`${hoje}T03:00:00Z`).getTime() - n * 86400000)
}
const emHoras = (base: Date, h: number, m = entre(0, 59)) => new Date(base.getTime() + (h * 60 + m) * 60000)
const dec = (centavos: number) => new Prisma.Decimal(centavos).div(100) as unknown as Prisma.Decimal

// ---- catálogo fictício -------------------------------------------------------------

const CARDAPIO = [
  {
    categoria: "Entradas",
    itens: [
      { titulo: "Pão de queijo da serra (6 un.)", preco: 1800, descricao: "Feito na hora com queijo canastra", destaque: true },
      { titulo: "Bolinho de bacalhau (4 un.)", preco: 3200 },
      { titulo: "Polenta frita com queijo", preco: 2600, descricao: "Porção para dois" },
    ],
  },
  {
    categoria: "Pratos",
    itens: [
      { titulo: "Truta da montanha grelhada", preco: 8900, descricao: "Com arroz de alho-poró e legumes", destaque: true },
      { titulo: "Costelinha com polenta cremosa", preco: 7900, descricao: "Cozida por 6 horas" },
      { titulo: "Frango caipira com quiabo", preco: 6900 },
      { titulo: "Risoto de cogumelos da serra", preco: 7200, promo: 5900 },
      { titulo: "Feijoada da casa (sábado)", preco: 8500, disponivel: false },
    ],
  },
  {
    categoria: "Lanches",
    itens: [
      { titulo: "Sanduíche de pernil", preco: 3400, destaque: true },
      { titulo: "Tábua de frios da serra", preco: 9800, descricao: "Queijos e embutidos da região" },
      { titulo: "Torta de palmito", preco: 2400 },
    ],
  },
  {
    categoria: "Bebidas",
    itens: [
      { titulo: "Café coado da serra", preco: 700 },
      { titulo: "Cappuccino artesanal", preco: 1400 },
      { titulo: "Suco natural", preco: 1200, variacoes: [{ nome: "300ml", preco: 1200 }, { nome: "500ml", preco: 1600 }] },
      { titulo: "Chopp artesanal", preco: 1800, variacoes: [{ nome: "300ml", preco: 1800 }, { nome: "500ml", preco: 2500 }] },
      { titulo: "Água mineral", preco: 600 },
      { titulo: "Vinho da serra (taça)", preco: 2800 },
    ],
  },
  {
    categoria: "Sobremesas",
    itens: [
      { titulo: "Pudim de leite", preco: 1800, destaque: true },
      { titulo: "Brownie com sorvete", preco: 2400 },
      { titulo: "Doce de leite com queijo", preco: 1600 },
    ],
  },
] as const

const CLIENTES = [
  ["Ana Beatriz Moraes", "12988120001", ["frequente"]],
  ["Carlos Henrique Dias", "12988120002", ["delivery"]],
  ["Daniela Prado", "12988120003", ["frequente", "vinho"]],
  ["Eduardo Salles", "12988120004", []],
  ["Fernanda Lima", "12988120005", ["aniversariante"]],
  ["Gustavo Ribeiro", "12988120006", ["delivery"]],
  ["Helena Castro", "12988120007", ["frequente"]],
  ["Igor Menezes", "12988120008", []],
  ["Juliana Tavares", "12988120009", ["turista"]],
  ["Marcelo Antunes", "12988120010", ["turista"]],
  ["Patrícia Nunes", "12988120011", ["frequente"]],
  ["Rodrigo Campos", "12988120012", []],
] as const

const RUAS = ["Rua das Hortênsias", "Rua Cel. Rosa", "Av. Sebastião de Melo", "Rua do Mirante", "Travessa da Pedra"]
const MESAS = ["1", "2", "3", "4", "5", "6", "Varanda 1", "Varanda 2"]

async function limpar() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: "demo-" } }, select: { id: true } })
  await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } })
  const restantes = await prisma.comercio.deleteMany({ where: { nome: NOME_LOJA } })
  console.log(`🧹 demo apagada (${users.length} usuário(s), ${restantes.count} comércio(s) órfão(s))`)
}

async function main() {
  if (process.argv.includes("--limpar")) return limpar()
  await limpar() // recria do zero, para a demo ficar sempre igual

  const plano = await prisma.plan.findUnique({ where: { slug: "premium" } })
  if (!plano) throw new Error("Plano 'premium' não encontrado — rode o seed do projeto antes.")
  const senha = await bcrypt.hash(SENHA, 10)
  const criarUsuario = (nome: string, papel: string) =>
    prisma.user.create({ data: { name: nome, email: `demo-${papel}${SUFIXO}`, password: senha, role: "COMERCIANTE" } })

  const dono = await criarUsuario("Marina Duarte", "dono")
  const gerente = await criarUsuario("Rafael Antunes", "gerente")
  const atendente = await criarUsuario("Júlia Freitas", "atendente")
  const producao = await criarUsuario("Seu Nilton", "producao")

  const horarios = JSON.stringify(
    ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((dia) => ({
      dia,
      aberto: dia !== "Segunda",
      inicio: "11:00",
      fim: dia === "Sexta" || dia === "Sábado" ? "23:00" : "22:00",
      // Pausa da tarde só na terça e na quinta — nos outros dias a loja fica
      // aberta direto (a demo mostra melhor com a vitrine "Aberto agora").
      temPausa: dia === "Terça" || dia === "Quinta",
      pausaInicio: "15:00",
      pausaFim: "18:00",
    })),
  )

  const comercio = await prisma.comercio.create({
    data: {
      nome: NOME_LOJA,
      slug: "cantinho-da-serra-demo",
      descricao:
        "Restaurante de montanha com comida caseira, truta da região e café coado na hora. Varanda com vista para a Pedra do Baú. (Loja fictícia de demonstração.)",
      categorias: ["ALIMENTACAO"],
      status: "ATIVO",
      planId: plano.id,
      ownerId: dono.id,
      cep: "12490-000",
      endereco: "Rua das Hortênsias",
      numero: "245",
      bairro: "Centro",
      cidade: "São Bento do Sapucaí",
      estado: "SP",
      lat: -22.6889,
      lng: -45.7306,
      telefone: "1236712345",
      whatsapp: "12988120000",
      email: `contato${SUFIXO}`,
      instagram: "cantinhodaserra.demo",
      logo: "/assets/categorias/alimentacao.jpg",
      horarios,
      membros: {
        create: [
          { userId: dono.id, papel: "DONO" },
          { userId: gerente.id, papel: "GERENTE" },
          { userId: atendente.id, papel: "ATENDENTE" },
          { userId: producao.id, papel: "PRODUCAO" },
        ],
      },
      fotos: {
        create: [
          { url: "/assets/categorias/alimentacao.jpg", alt: "Salão do restaurante", ordem: 0 },
          { url: "/assets/home/sbs.jpg", alt: "Vista da varanda", ordem: 1 },
          { url: "/assets/home/sbs1.jpg", alt: "Serra ao entardecer", ordem: 2 },
        ],
      },
      tags: { create: ["comida caseira", "truta", "café da serra", "varanda", "vista para a Pedra do Baú"].map((nome) => ({ nome })) },
      eventos: {
        create: [
          {
            titulo: "Noite da truta com música ao vivo",
            descricao: "Menu especial de truta e viola caipira a partir das 20h.",
            dataInicio: emHoras(diaBase(-5), 20),
            local: "Salão principal",
            preco: 120, // Evento.preco é em reais
          },
          {
            titulo: "Café colonial de domingo",
            descricao: "Mesa farta com bolos, pães e queijos da região.",
            dataInicio: emHoras(diaBase(-12), 15),
            preco: 89,
          },
        ],
      },
    },
  })

  await prisma.pedidoConfig.create({
    data: {
      comercioId: comercio.id,
      aceitaPedidos: true,
      entregaAtiva: true,
      retiradaAtiva: true,
      pedidoMinimo: dec(3000),
      tempoPreparoMin: 35,
      taxaServicoPct: new Prisma.Decimal(10) as unknown as Prisma.Decimal,
      formasPagamento: ["pix", "dinheiro", "credito", "debito"],
      proximoNumero: 1,
    },
  })

  // Mesas do salão com QR Code
  await prisma.mesa.createMany({
    data: MESAS.map((nome, ordem) => ({
      comercioId: comercio.id,
      nome,
      area: nome.startsWith("Varanda") ? "Varanda" : "Salão",
      token: novoToken(),
      ordem,
    })),
  })
  const mesasCadastradas = new Map((await prisma.mesa.findMany({ where: { comercioId: comercio.id }, select: { id: true, nome: true } })).map((m) => [m.nome, m.id]))

  const zonas = await Promise.all(
    [
      ["Centro", 500],
      ["Bairro Alto", 800],
      ["Sertãozinho", 1200],
    ].map(([nome, taxa], ordem) =>
      prisma.zonaEntrega.create({
        data: { comercioId: comercio.id, nome: nome as string, cidade: "São Bento do Sapucaí", uf: "SP", taxa: dec(taxa as number), ordem },
      }),
    ),
  )

  // ---- cardápio
  const produtos: { id: string; titulo: string; precoC: number; variacoes: { id: string; nome: string; precoC: number }[] }[] = []
  for (const [ordem, grupo] of CARDAPIO.entries()) {
    const categoria = await prisma.cardapioCategoria.create({ data: { comercioId: comercio.id, nome: grupo.categoria, ordem } })
    for (const [i, item] of grupo.itens.entries()) {
      const it = item as { titulo: string; preco: number; descricao?: string; destaque?: boolean; disponivel?: boolean; promo?: number; variacoes?: { nome: string; preco: number }[] }
      const criado = await prisma.produto.create({
        data: {
          comercioId: comercio.id,
          categoriaCardapioId: categoria.id,
          titulo: it.titulo,
          descricao: it.descricao ?? null,
          preco: it.variacoes ? null : it.preco / 100,
          precoPromo: it.promo ? it.promo / 100 : null,
          promoFim: it.promo ? diaBase(-10) : null,
          destaque: !!it.destaque,
          disponivel: it.disponivel !== false,
          ordem: i,
          variacoes: it.variacoes ? { create: it.variacoes.map((v, o) => ({ nome: v.nome, preco: v.preco / 100, ordem: o })) } : undefined,
        },
        include: { variacoes: true },
      })
      if (it.disponivel !== false) {
        produtos.push({
          id: criado.id,
          titulo: criado.titulo,
          precoC: it.promo ?? it.preco,
          variacoes: criado.variacoes.map((v) => ({ id: v.id, nome: v.nome, precoC: Math.round(v.preco * 100) })),
        })
      }
    }
  }

  // Catálogo (produtos e serviços fora do cardápio)
  const catalogo = await prisma.catalogoCategoria.create({ data: { comercioId: comercio.id, nome: "Da nossa cozinha", tipo: "PRODUTO", ordem: 0 } })
  await prisma.produto.createMany({
    data: [
      { comercioId: comercio.id, categoriaCatalogoId: catalogo.id, titulo: "Geleia de amora (250g)", preco: 32, tipo: "PRODUTO", destaque: true },
      { comercioId: comercio.id, categoriaCatalogoId: catalogo.id, titulo: "Café em grãos (500g)", preco: 45, tipo: "PRODUTO" },
      { comercioId: comercio.id, titulo: "Reserva do salão para eventos", preco: 0, tipo: "SERVICO" },
    ],
  })

  // ---- clientes
  const clientes = await Promise.all(
    CLIENTES.map(([nome, whatsapp, tags], i) =>
      prisma.cliente.create({
        data: {
          comercioId: comercio.id,
          nome: nome as string,
          whatsapp: whatsapp as string,
          tags: tags as unknown as string[],
          aniversario: i % 3 === 0 ? new Date(Date.UTC(2000, (new Date().getMonth() + (i % 2)) % 12, 5 + i)) : null,
          observacoes: i === 2 ? "Prefere mesa na varanda." : null,
          createdAt: diaBase(DIAS - i),
        },
      }),
    ),
  )

  // ---- vendas ------------------------------------------------------------------------

  let numero = 1
  const autores = [
    { nome: atendente.name, id: atendente.id },
    { nome: gerente.name, id: gerente.id },
    { nome: dono.name, id: dono.id },
  ]

  interface ItemVenda { produtoId: string; titulo: string; variacaoNome: string | null; precoC: number; quantidade: number }

  function sortearItens(qtdMax = 4): ItemVenda[] {
    const n = entre(1, qtdMax)
    const itens: ItemVenda[] = []
    for (let i = 0; i < n; i++) {
      const p = escolher(produtos)
      const v = p.variacoes.length > 0 ? escolher(p.variacoes) : null
      itens.push({ produtoId: p.id, titulo: p.titulo, variacaoNome: v?.nome ?? null, precoC: v?.precoC ?? p.precoC, quantidade: entre(1, 3) })
    }
    return itens
  }

  async function criarVenda(opts: {
    origem: "ONLINE" | "BALCAO" | "TELEFONE" | "COMANDA"
    quando: Date
    status: "CONCLUIDO" | "CANCELADO" | "ABERTA" | "AGUARDANDO" | "EM_PREPARO" | "PRONTO"
    itens: ItemVenda[]
    mesa?: string | null
    clienteIdx?: number | null
    entrega?: boolean
    servico?: boolean
    descontoPct?: number
    // "conta" = uma forma só; "dividido" = duas pessoas; "nenhum" = cancelada/aberta
    pagamento?: "conta" | "dividido" | "nenhum"
    pagamentoParcialC?: number // comanda aberta: quanto já foi pago
    motivo?: string
    rodadaEnviada?: boolean
    rodadaPronta?: boolean
  }) {
    const cliente = opts.clienteIdx != null ? clientes[opts.clienteIdx] : null
    const zona = opts.entrega ? escolher(zonas) : null
    const brutoC = opts.itens.reduce((a, i) => a + i.precoC * i.quantidade, 0)
    const descontoC = opts.descontoPct ? Math.round((brutoC * opts.descontoPct) / 100) : 0
    const servicoC = opts.servico ? Math.round((brutoC - descontoC) / 10) : 0
    const entregaC = zona ? Math.round(Number(zona.taxa) * 100) : 0
    const totalC = brutoC - descontoC + servicoC + entregaC
    const concluida = opts.status === "CONCLUIDO"
    const encerrada = concluida || opts.status === "CANCELADO"

    // Os pagamentos fecham exatamente o total (itens − desconto + serviço + entrega).
    const modo = opts.pagamento ?? "conta"
    let pagamentos: { forma: string; valorC: number; recebidoC?: number; pagante?: string }[] = []
    if (modo === "dividido") {
      const metade = Math.round(totalC / 2)
      pagamentos = [
        { forma: "pix", valorC: metade, pagante: "Pessoa 1" },
        { forma: escolher(["credito", "debito", "dinheiro"]), valorC: totalC - metade, pagante: "Pessoa 2" },
      ]
    } else if (modo === "conta") {
      const forma = escolher(["pix", "pix", "dinheiro", "credito", "credito", "debito"])
      pagamentos = [{ forma, valorC: totalC, ...(forma === "dinheiro" ? { recebidoC: Math.ceil((totalC + entre(0, 2000)) / 500) * 500 } : {}) }]
    } else if (opts.pagamentoParcialC) {
      pagamentos = [{ forma: "pix", valorC: opts.pagamentoParcialC, pagante: "Ana" }]
    }
    const autor = opts.origem === "ONLINE" ? null : escolher(autores)

    const pedido = await prisma.pedido.create({
      data: {
        comercioId: comercio.id,
        numero: numero++,
        origem: opts.origem,
        status: opts.status,
        tipoEntrega: zona ? "ENTREGA" : "RETIRADA",
        mesa: opts.mesa ?? null,
        mesaId: opts.mesa ? mesasCadastradas.get(opts.mesa) ?? null : null,
        clienteId: cliente?.id ?? null,
        clienteNome: cliente?.nome ?? (opts.mesa ? `Mesa ${opts.mesa}` : "Cliente balcão"),
        clienteWhats: cliente?.whatsapp ?? "",
        endereco: zona ? escolher(RUAS) : null,
        numeroEnd: zona ? String(entre(10, 900)) : null,
        bairro: zona?.nome ?? null,
        formaPagamento: opts.status === "ABERTA" ? "" : [...new Set(pagamentos.map((p) => p.forma))].length === 1 ? pagamentos[0].forma : "multiplas",
        observacoes: chance(0.12) ? escolher(["Sem cebola, por favor.", "Aniversário — trazer vela.", "Embalar para viagem."]) : null,
        subtotal: dec(brutoC), // já líquido de desconto por item (a demo não usa); o desconto da conta é separado
        desconto: dec(descontoC),
        descontoPercentual: opts.descontoPct ? new Prisma.Decimal(opts.descontoPct) as unknown as Prisma.Decimal : null,
        taxaServico: dec(servicoC),
        servicoPercentual: opts.servico ? (new Prisma.Decimal(10) as unknown as Prisma.Decimal) : null,
        taxaEntrega: dec(entregaC),
        total: dec(totalC),
        motivoCancelamento: opts.motivo ?? null,
        criadoPorId: autor?.id ?? null,
        criadoPorNome: autor?.nome ?? null,
        createdAt: opts.quando,
        updatedAt: opts.quando,
        fechadaEm: encerrada ? new Date(opts.quando.getTime() + entre(20, 90) * 60000) : null,
        itens: {
          create: opts.itens.map((i) => ({
            produtoId: i.produtoId,
            titulo: i.titulo,
            variacaoNome: i.variacaoNome,
            precoUnit: dec(i.precoC),
            quantidade: i.quantidade,
            createdAt: opts.quando,
            rodada: opts.rodadaEnviada ? 1 : null,
            enviadoEm: opts.rodadaEnviada ? new Date(opts.quando.getTime() + 60000) : null,
            prontoEm: opts.rodadaPronta ? new Date(opts.quando.getTime() + 15 * 60000) : null,
          })),
        },
        pagamentos: { create: pagamentos.map((p) => ({ comercioId: comercio.id, forma: p.forma, valor: dec(p.valorC), recebido: p.recebidoC ? dec(p.recebidoC) : null, pagante: p.pagante ?? null, autorNome: autor?.nome ?? null, createdAt: opts.quando })) },
      },
    })

    // Linha do tempo coerente com o status
    const historico: Prisma.PedidoHistoricoCreateManyInput[] = []
    const reg = (status: Prisma.PedidoHistoricoCreateManyInput["status"], min: number, extra: Partial<Prisma.PedidoHistoricoCreateManyInput> = {}) =>
      historico.push({ pedidoId: pedido.id, status, origem: opts.origem === "ONLINE" && status === "AGUARDANDO" ? "CLIENTE" : "LOJA", autorNome: status === "AGUARDANDO" && opts.origem === "ONLINE" ? cliente?.nome ?? "Cliente" : autor?.nome ?? null, createdAt: new Date(opts.quando.getTime() + min * 60000), ...extra })

    if (opts.origem === "ONLINE") {
      reg("AGUARDANDO", 0)
      if (["EM_PREPARO", "PRONTO", "CONCLUIDO"].includes(opts.status)) reg("ACEITO", 2)
      if (["EM_PREPARO", "PRONTO", "CONCLUIDO"].includes(opts.status)) reg("EM_PREPARO", 5)
      if (["PRONTO", "CONCLUIDO"].includes(opts.status)) reg("PRONTO", 25)
      if (opts.status === "CONCLUIDO") reg("CONCLUIDO", 40)
    } else if (opts.status === "ABERTA") {
      reg("ABERTA", 0, { descricao: null })
      if (opts.rodadaEnviada) reg("ABERTA", 1, { descricao: `Lançou ${opts.itens.reduce((a, i) => a + i.quantidade, 0)} item(ns) e enviou para a produção (rodada 1)` })
    } else {
      reg(opts.status === "CANCELADO" ? "CONCLUIDO" : "CONCLUIDO", 0)
      if (opts.status === "CANCELADO") reg("CANCELADO", 30, { motivo: opts.motivo ?? null })
    }
    await prisma.pedidoHistorico.createMany({ data: historico })
    return pedido
  }

  // Histórico dos últimos dias (movimento maior na sexta e no sábado)
  const agora = new Date()
  for (let d = DIAS; d >= 0; d--) {
    const dia = diaBase(d)
    const diaSemana = new Date(dia.getTime() + 3 * 3600000).getUTCDay()
    if (diaSemana === 1) continue // fecha segunda
    const base = diaSemana === 5 || diaSemana === 6 ? entre(16, 24) : entre(8, 15)
    for (let i = 0; i < base; i++) {
      const almoco = chance(0.55)
      const quando = emHoras(dia, almoco ? entre(11, 14) : entre(18, 21))
      if (quando > agora) continue
      const sorteio = rnd()
      const origem = sorteio < 0.4 ? "BALCAO" : sorteio < 0.72 ? "COMANDA" : sorteio < 0.87 ? "TELEFONE" : "ONLINE"
      const itens = sortearItens(origem === "COMANDA" ? 5 : 3)
      const clienteIdx = chance(0.55) ? entre(0, clientes.length - 1) : null
      const cancelada = chance(0.03)
      const servico = origem === "COMANDA" && chance(0.85)
      const descontoPct = chance(0.08) ? escolher([5, 10]) : 0
      const dividido = origem === "COMANDA" && chance(0.35)

      await criarVenda({
        origem,
        quando,
        status: cancelada ? "CANCELADO" : "CONCLUIDO",
        itens,
        mesa: origem === "COMANDA" ? escolher(MESAS) : null,
        clienteIdx,
        entrega: (origem === "TELEFONE" || origem === "ONLINE") && chance(0.6),
        servico,
        descontoPct,
        pagamento: cancelada ? "nenhum" : dividido ? "dividido" : "conta",
        motivo: cancelada ? escolher(["Cliente desistiu", "Lançada em duplicidade", "Erro no pedido"]) : undefined,
      })
    }
  }

  // ---- situação de agora: comandas abertas, fila e produção -------------------------

  const inicioHoje = diaBase(0)
  const horaAgora = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", hour12: false }).format(agora))
  const recente = (minAtras: number) => new Date(Math.max(agora.getTime() - minAtras * 60000, inicioHoje.getTime()))

  // Mesa 3: itens já na produção (aparece na tela Produção)
  await criarVenda({ origem: "COMANDA", quando: recente(25), status: "ABERTA", itens: sortearItens(4), mesa: "3", servico: true, rodadaEnviada: true, pagamento: "nenhum" })
  await criarVenda({ origem: "COMANDA", quando: recente(14), status: "ABERTA", itens: sortearItens(3), mesa: "Varanda 1", servico: true, rodadaEnviada: true, pagamento: "nenhum", clienteIdx: 6 })
  // Varanda 2: rodada pronta e um pagamento parcial (divisão em andamento)
  const varanda = await criarVenda({
    origem: "COMANDA", quando: recente(70), status: "ABERTA", mesa: "Varanda 2", servico: true, clienteIdx: 2,
    itens: sortearItens(4), rodadaEnviada: true, rodadaPronta: true,
    pagamento: "nenhum", pagamentoParcialC: 4000,
  })
  await prisma.pedido.update({
    where: { id: varanda.id },
    data: { divisao: { modo: "igual", pessoas: [{ id: "p1", nome: "Ana" }, { id: "p2", nome: "Bia" }, { id: "p3", nome: "Caio" }], itens: {}, valores: {} } },
  })
  // Mesa 6: acabou de abrir, sem nada lançado
  await criarVenda({ origem: "COMANDA", quando: recente(6), status: "ABERTA", itens: [], mesa: "6", servico: true, pagamento: "nenhum" })

  // Fila de pedidos online
  await criarVenda({ origem: "ONLINE", quando: recente(4), status: "AGUARDANDO", itens: sortearItens(2), clienteIdx: 1, entrega: true })
  await criarVenda({ origem: "ONLINE", quando: recente(12), status: "AGUARDANDO", itens: sortearItens(2), clienteIdx: 5 })
  await criarVenda({ origem: "ONLINE", quando: recente(22), status: "EM_PREPARO", itens: sortearItens(3), clienteIdx: 8, entrega: true })
  await criarVenda({ origem: "TELEFONE", quando: recente(35), status: "PRONTO", itens: sortearItens(2), clienteIdx: 3, entrega: true })

  await prisma.pedidoConfig.update({ where: { comercioId: comercio.id }, data: { proximoNumero: numero } })

  // ---- visitas no guia (analytics e conversão dos relatórios)
  const eventos: Prisma.AnalyticsEventCreateManyInput[] = []
  for (let d = DIAS; d >= 0; d--) {
    const dia = diaBase(d)
    for (let i = 0; i < entre(20, 60); i++) {
      const quando = emHoras(dia, entre(9, 22))
      if (quando > agora) continue
      const visitante = `demo-v${entre(1, 400)}`
      const origemVisita = escolher(["home_destaque", "home_abertos", "listagem", "mapa", "busca", "google", "direto", "qr"])
      eventos.push({ comercioId: comercio.id, tipo: "view", origem: origemVisita, visitorId: visitante, createdAt: quando })
      if (chance(0.55)) eventos.push({ comercioId: comercio.id, tipo: "cardapio_view", origem: origemVisita, visitorId: visitante, createdAt: new Date(quando.getTime() + 60000) })
      if (chance(0.3)) eventos.push({ comercioId: comercio.id, tipo: escolher(["click_whatsapp", "click_rota", "click_ligar", "item_view", "galeria_view"]), origem: origemVisita, visitorId: visitante, createdAt: new Date(quando.getTime() + 120000) })
    }
  }
  await prisma.analyticsEvent.createMany({ data: eventos })

  // ---- resumo no terminal
  const [vendas] = await prisma.$queryRaw<{ n: number; total: string }[]>`
    SELECT COUNT(*)::int AS n, COALESCE(SUM(total), 0)::text AS total
    FROM pedidos WHERE "comercioId" = ${comercio.id} AND status = 'CONCLUIDO'`
  const abertas = await prisma.pedido.count({ where: { comercioId: comercio.id, status: "ABERTA" } })
  const fila = await prisma.pedido.count({ where: { comercioId: comercio.id, status: { in: ["AGUARDANDO", "EM_PREPARO", "PRONTO"] } } })

  console.log(`\n✅ Loja de demonstração criada: ${NOME_LOJA} (fictícia)`)
  console.log(`   ${vendas.n} vendas concluídas · R$ ${Number(vendas.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${DIAS} dias`)
  console.log(`   ${abertas} comanda(s) aberta(s) · ${fila} pedido(s) na fila · ${eventos.length} visitas no guia · hora local ${horaAgora}h`)
  console.log(`\n   Acesso (senha ${SENHA} para todos):`)
  console.log(`   dono       demo-dono${SUFIXO}        (vê tudo: relatórios, equipe, vitrine)`)
  console.log(`   gerente    demo-gerente${SUFIXO}     (tudo da operação, sem equipe)`)
  console.log(`   atendente  demo-atendente${SUFIXO}   (PDV e pedidos, sem valores dos relatórios)`)
  console.log(`   produção   demo-producao${SUFIXO}    (só a fila da cozinha)`)
  console.log(`\n   Vitrine pública: /vitrine/${comercio.slug}`)
  console.log(`   Apagar depois: npx tsx prisma/seed-demo.ts --limpar\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
