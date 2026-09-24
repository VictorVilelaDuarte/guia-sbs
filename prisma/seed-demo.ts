/**
 * Loja de DEMONSTRAÇÃO — dados fictícios para apresentar o sistema
 *
 * Cria um restaurante fictício ("Cantinho da Serra") com cardápio, equipe,
 * clientes, dois meses de vendas até a hora em que roda (balcão, telefone,
 * comandas e pedido online) e visitas no analytics. Serve para apresentar o
 * painel, o PDV e os relatórios com a tela cheia de vida.
 *
 * Nenhuma venda fica em aberto: todas terminam concluídas, canceladas ou
 * recusadas — sem comanda aberta, fila de pedidos ou item na produção. Para a
 * apresentação mostrar vendas "de hoje", rode o seed pouco antes.
 *
 * Nada aqui é dado real: nomes de loja, pessoas e telefones são inventados.
 *
 *   npx tsx prisma/seed-demo.ts           # cria (recria se já existir — os usuários
 *                                         # são recriados, então quem estava logado
 *                                         # na demo precisa entrar de novo)
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
const DIAS = 60 // histórico de vendas (cobre o "mês anterior" dos relatórios)
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

// Códigos da demo — determinísticos e fora do sorteio (não mudam as vendas).
// EAN-13 fictício com prefixo brasileiro (789) e dígito verificador válido.
let seqEan = 0
function proximoEan(): string {
  const base = `7891234${String(++seqEan).padStart(5, "0")}`
  const soma = [...base].reduce((a, d, i) => a + Number(d) * (i % 2 === 0 ? 1 : 3), 0)
  return base + ((10 - (soma % 10)) % 10)
}
let seqInterno = 100
const proximoInterno = () => String(++seqInterno)
// Custo de ~38% do preço (margem típica de restaurante), em centavos.
const custoDe = (precoC: number) => Math.round(precoC * 0.38)

// ---- catálogo fictício -------------------------------------------------------------

const CARDAPIO = [
  {
    categoria: "Entradas",
    itens: [
      { titulo: "Pão de queijo da serra (6 un.)", preco: 1800, descricao: "Feito na hora com queijo canastra", destaque: true },
      { titulo: "Bolinho de bacalhau (4 un.)", preco: 3200 },
      { titulo: "Polenta frita com queijo", preco: 2600, descricao: "Porção para dois" },
      { titulo: "Caldo de mandioquinha", preco: 2200, descricao: "Com torradas de alho" },
      { titulo: "Pastel de palmito (4 un.)", preco: 2800 },
    ],
  },
  {
    categoria: "Pratos",
    itens: [
      { titulo: "Truta da montanha grelhada", preco: 8900, descricao: "Com arroz de alho-poró e legumes", destaque: true },
      { titulo: "Costelinha com polenta cremosa", preco: 7900, descricao: "Cozida por 6 horas" },
      { titulo: "Frango caipira com quiabo", preco: 6900 },
      { titulo: "Risoto de cogumelos da serra", preco: 7200, promo: 5900 },
      { titulo: "Filé ao molho de pinhão", preco: 9800, descricao: "Com purê rústico de batata", destaque: true },
      { titulo: "Truta ao molho de amêndoas", preco: 9400 },
      { titulo: "Parmegiana da casa", preco: 7400, descricao: "Serve bem uma pessoa" },
      { titulo: "Nhoque de batata com ragu", preco: 6400 },
      { titulo: "Feijoada da casa (sábado)", preco: 8500, disponivel: false },
    ],
  },
  {
    categoria: "Lanches",
    itens: [
      { titulo: "Sanduíche de pernil", preco: 3400, destaque: true },
      { titulo: "Tábua de frios da serra", preco: 9800, descricao: "Queijos e embutidos da região" },
      { titulo: "Torta de palmito", preco: 2400 },
      { titulo: "Misto quente", preco: 1900 },
      { titulo: "Hambúrguer artesanal", preco: 4200, descricao: "Blend da casa, queijo canastra e maionese de ervas" },
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
      { titulo: "Refrigerante lata", preco: 700 },
      { titulo: "Cerveja long neck", preco: 1300 },
      { titulo: "Chá de hortelã da horta", preco: 900 },
      { titulo: "Chocolate quente", preco: 1600, variacoes: [{ nome: "Tradicional", preco: 1600 }, { nome: "Com chantilly", preco: 1900 }] },
    ],
  },
  {
    categoria: "Sobremesas",
    itens: [
      { titulo: "Pudim de leite", preco: 1800, destaque: true },
      { titulo: "Brownie com sorvete", preco: 2400 },
      { titulo: "Doce de leite com queijo", preco: 1600 },
      { titulo: "Petit gâteau", preco: 2800 },
      { titulo: "Torta de maçã com canela", preco: 2200 },
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
  ["Sílvia Rocha", "12988120013", ["frequente", "vinho"]],
  ["Tiago Barreto", "12988120014", ["turista"]],
  ["Vanessa Pires", "12988120015", ["delivery"]],
  ["Wagner Lopes", "12988120016", []],
  ["Beatriz Almeida", "12988120017", ["turista", "vinho"]],
  ["Otávio Fernandes", "12988120018", ["frequente"]],
  ["Luana Siqueira", "12988120019", ["aniversariante"]],
  ["Renato Guimarães", "12988120020", ["delivery"]],
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
      lugares: nome.startsWith("Varanda") ? 6 : [2, 4, 4, 6][ordem % 4],
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
  const produtos: {
    id: string
    titulo: string
    precoC: number
    codigo: string | null
    custoC: number | null
    variacoes: { id: string; nome: string; precoC: number; codigo: string | null; custoC: number | null }[]
  }[] = []
  for (const [ordem, grupo] of CARDAPIO.entries()) {
    const categoria = await prisma.cardapioCategoria.create({ data: { comercioId: comercio.id, nome: grupo.categoria, ordem } })
    for (const [i, item] of grupo.itens.entries()) {
      const it = item as { titulo: string; preco: number; descricao?: string; destaque?: boolean; disponivel?: boolean; promo?: number; variacoes?: { nome: string; preco: number }[] }
      // Bebidas industrializadas têm código de barras; tudo tem código interno e custo.
      const temEan = grupo.categoria === "Bebidas"
      const codigoInterno = proximoInterno()
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
          codigoInterno,
          // Água mineral: no cardápio e no catálogo (também vendida "para levar").
          noCatalogo: it.titulo === "Água mineral",
          codigoBarras: temEan && !it.variacoes ? proximoEan() : null,
          precoCusto: it.variacoes ? null : custoDe(it.preco) / 100,
          variacoes: it.variacoes
            ? {
                create: it.variacoes.map((v, o) => ({
                  nome: v.nome,
                  preco: v.preco / 100,
                  ordem: o,
                  codigoBarras: temEan ? proximoEan() : null,
                  precoCusto: custoDe(v.preco) / 100,
                })),
              }
            : undefined,
        },
        include: { variacoes: true },
      })
      if (it.disponivel !== false) {
        produtos.push({
          id: criado.id,
          titulo: criado.titulo,
          precoC: it.promo ?? it.preco,
          codigo: criado.codigoBarras ?? criado.codigoInterno,
          custoC: criado.precoCusto != null ? Math.round(criado.precoCusto * 100) : null,
          variacoes: criado.variacoes.map((v) => ({
            id: v.id,
            nome: v.nome,
            precoC: Math.round(v.preco * 100),
            codigo: v.codigoBarras ?? criado.codigoInterno,
            custoC: v.precoCusto != null ? Math.round(v.precoCusto * 100) : null,
          })),
        })
      }
    }
  }

  // Complementos: grupos da loja ligados a alguns pratos
  const adicionais = await prisma.grupoComplemento.create({
    data: {
      comercioId: comercio.id, nome: "Adicionais", minimo: 0, maximo: 3, ordem: 0,
      opcoes: { create: [
        { nome: "Queijo extra", preco: 6, quantidadeMax: 2, ordem: 0 },
        { nome: "Bacon", preco: 8, quantidadeMax: 2, ordem: 1 },
        { nome: "Ovo", preco: 4, ordem: 2 },
        { nome: "Sem cebola", preco: 0, ordem: 3 },
      ] },
    },
  })
  const pontoCarne = await prisma.grupoComplemento.create({
    data: {
      comercioId: comercio.id, nome: "Ponto da carne", minimo: 1, maximo: 1, ordem: 1,
      opcoes: { create: [{ nome: "Ao ponto", preco: 0, ordem: 0 }, { nome: "Bem passado", preco: 0, ordem: 1 }, { nome: "Mal passada", preco: 0, ordem: 2 }] },
    },
  })
  for (const [titulo, grupos] of [
    ["Costelinha com polenta cremosa", [adicionais.id, pontoCarne.id]],
    ["Sanduíche de pernil", [adicionais.id]],
    ["Misto quente", [adicionais.id]],
  ] as const) {
    const alvo = await prisma.produto.findFirst({ where: { comercioId: comercio.id, titulo }, select: { id: true } })
    if (alvo) await prisma.produtoComplemento.createMany({ data: grupos.map((grupoId, ordem) => ({ produtoId: alvo.id, grupoId, ordem })) })
  }

  // Catálogo (produtos e serviços fora do cardápio)
  const catalogo = await prisma.catalogoCategoria.create({ data: { comercioId: comercio.id, nome: "Da nossa cozinha", tipo: "PRODUTO", ordem: 0 } })
  const itemCatalogo = (titulo: string, precoC: number, extra: Partial<Prisma.ProdutoCreateManyInput> = {}) => ({
    comercioId: comercio.id,
    categoriaCatalogoId: catalogo.id,
    titulo,
    preco: precoC / 100,
    tipo: "PRODUTO" as const,
    codigoBarras: proximoEan(),
    codigoInterno: proximoInterno(),
    precoCusto: Math.round(precoC * 0.55) / 100, // revenda: margem menor
    marca: "Cantinho da Serra",
    noCatalogo: true,
    ...extra,
  })
  await prisma.produto.createMany({
    data: [
      itemCatalogo("Geleia de amora (250g)", 3200, { destaque: true }),
      itemCatalogo("Café em grãos (500g)", 4500, { marca: "Café da Mantiqueira" }),
      itemCatalogo("Queijo canastra (500g)", 5800, { destaque: true, marca: "Queijaria Serra Alta" }),
      itemCatalogo("Doce de leite caseiro (400g)", 2800),
      itemCatalogo("Cachaça artesanal (700ml)", 7900, { marca: "Alambique do Baú" }),
      // Só no balcão: não aparece na vitrine nem no cardápio online.
      itemCatalogo("Sacola retornável", 400, { categoriaCatalogoId: null, marca: null, noCatalogo: false, precoCusto: 1.8 }),
      { comercioId: comercio.id, titulo: "Reserva do salão para eventos", preco: 0, tipo: "SERVICO", noCatalogo: true, codigoInterno: proximoInterno() },
      { comercioId: comercio.id, titulo: "Café colonial para grupos (por pessoa)", preco: 89, tipo: "SERVICO", noCatalogo: true, codigoInterno: proximoInterno() },
    ],
  })
  // Item fora de linha: arquivado (some do cardápio e do PDV, fica no painel).
  const sobremesas = await prisma.cardapioCategoria.findFirst({ where: { comercioId: comercio.id, nome: "Sobremesas" }, select: { id: true } })
  await prisma.produto.create({
    data: {
      comercioId: comercio.id,
      categoriaCardapioId: sobremesas?.id ?? null,
      titulo: "Sorvete de pinhão (saiu do cardápio)",
      preco: 19,
      precoCusto: 7.2,
      codigoInterno: proximoInterno(),
      arquivado: true,
      ordem: 99,
    },
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

  interface ItemVenda { produtoId: string; titulo: string; variacaoNome: string | null; precoC: number; quantidade: number; codigo: string | null; custoC: number | null }

  function sortearItens(qtdMax = 4): ItemVenda[] {
    const n = entre(1, qtdMax)
    const itens: ItemVenda[] = []
    for (let i = 0; i < n; i++) {
      const p = escolher(produtos)
      const v = p.variacoes.length > 0 ? escolher(p.variacoes) : null
      itens.push({
        produtoId: p.id,
        titulo: p.titulo,
        variacaoNome: v?.nome ?? null,
        precoC: v?.precoC ?? p.precoC,
        quantidade: entre(1, 3),
        codigo: v?.codigo ?? p.codigo,
        custoC: v?.custoC ?? p.custoC,
      })
    }
    return itens
  }

  async function criarVenda(opts: {
    origem: "ONLINE" | "BALCAO" | "TELEFONE" | "COMANDA"
    quando: Date
    // Só status terminais: a demo não deixa venda em aberto.
    status: "CONCLUIDO" | "CANCELADO" | "RECUSADO"
    itens: ItemVenda[]
    mesa?: string | null
    clienteIdx?: number | null
    entrega?: boolean
    servico?: boolean
    descontoPct?: number
    // "conta" = uma forma só; "dividido" = duas pessoas; "nenhum" = cancelada/recusada
    pagamento?: "conta" | "dividido" | "nenhum"
    motivo?: string
  }) {
    const cliente = opts.clienteIdx != null ? clientes[opts.clienteIdx] : null
    const zona = opts.entrega ? escolher(zonas) : null
    const brutoC = opts.itens.reduce((a, i) => a + i.precoC * i.quantidade, 0)
    const descontoC = opts.descontoPct ? Math.round((brutoC * opts.descontoPct) / 100) : 0
    const servicoC = opts.servico ? Math.round((brutoC - descontoC) / 10) : 0
    const entregaC = zona ? Math.round(Number(zona.taxa) * 100) : 0
    const totalC = brutoC - descontoC + servicoC + entregaC
    // Comanda concluída passou pela cozinha: rodada enviada e pronta (a tela
    // Produção fica vazia, sem item pendurado).
    const passouNaCozinha = opts.origem === "COMANDA" && opts.status === "CONCLUIDO"
    // "n minutos depois de aberta", mas nunca no futuro: venda aberta há pouco
    // fecha "agora" (senão contaria como não encerrada no dia de hoje).
    const depois = (min: number) => new Date(Math.min(opts.quando.getTime() + min * 60000, Date.now()))

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
        formaPagamento:
          pagamentos.length === 0
            ? escolher(["pix", "dinheiro", "credito"]) // cancelada/recusada: a forma escolhida no pedido
            : [...new Set(pagamentos.map((p) => p.forma))].length === 1 ? pagamentos[0].forma : "multiplas",
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
        // Toda venda da demo termina: a data de encerramento é o que conta nos relatórios.
        fechadaEm: depois(opts.status === "RECUSADO" ? entre(2, 6) : entre(20, 90)),
        itens: {
          create: opts.itens.map((i) => ({
            produtoId: i.produtoId,
            titulo: i.titulo,
            variacaoNome: i.variacaoNome,
            precoUnit: dec(i.precoC),
            codigo: i.codigo,
            custoUnit: i.custoC != null ? dec(i.custoC) : null,
            quantidade: i.quantidade,
            createdAt: opts.quando,
            rodada: passouNaCozinha ? 1 : null,
            enviadoEm: passouNaCozinha ? depois(1) : null,
            prontoEm: passouNaCozinha ? depois(15) : null,
          })),
        },
        pagamentos: { create: pagamentos.map((p) => ({ comercioId: comercio.id, forma: p.forma, valor: dec(p.valorC), recebido: p.recebidoC ? dec(p.recebidoC) : null, pagante: p.pagante ?? null, autorNome: autor?.nome ?? null, createdAt: opts.quando })) },
      },
    })

    // Linha do tempo coerente com o status
    const historico: Prisma.PedidoHistoricoCreateManyInput[] = []
    const reg = (status: Prisma.PedidoHistoricoCreateManyInput["status"], min: number, extra: Partial<Prisma.PedidoHistoricoCreateManyInput> = {}) =>
      historico.push({ pedidoId: pedido.id, status, origem: opts.origem === "ONLINE" && status === "AGUARDANDO" ? "CLIENTE" : "LOJA", autorNome: status === "AGUARDANDO" && opts.origem === "ONLINE" ? cliente?.nome ?? "Cliente" : autor?.nome ?? null, createdAt: depois(min), ...extra })

    if (opts.origem === "ONLINE") {
      reg("AGUARDANDO", 0)
      if (opts.status === "RECUSADO") reg("RECUSADO", 3, { motivo: opts.motivo ?? null })
      if (opts.status === "CONCLUIDO" || opts.status === "CANCELADO") {
        reg("ACEITO", 2)
        reg("EM_PREPARO", 5)
      }
      if (opts.status === "CONCLUIDO") {
        reg("PRONTO", 25)
        reg("CONCLUIDO", 40)
      }
      if (opts.status === "CANCELADO") reg("CANCELADO", 15, { motivo: opts.motivo ?? null })
    } else {
      reg(opts.status === "CANCELADO" ? "CONCLUIDO" : "CONCLUIDO", 0)
      if (opts.status === "CANCELADO") reg("CANCELADO", 30, { motivo: opts.motivo ?? null })
    }
    await prisma.pedidoHistorico.createMany({ data: historico })
    return pedido
  }

  // Histórico dos últimos dias (movimento maior na sexta e no sábado, e
  // crescendo ao longo dos dois meses — o gráfico conta uma história de alta).
  const agora = new Date()
  for (let d = DIAS; d >= 0; d--) {
    const dia = diaBase(d)
    const diaSemana = new Date(dia.getTime() + 3 * 3600000).getUTCDay()
    if (diaSemana === 1) continue // fecha segunda
    const crescimento = 0.7 + 0.5 * (1 - d / DIAS) // 0,7× há dois meses → 1,2× hoje
    const base = Math.round((diaSemana === 5 || diaSemana === 6 ? entre(18, 26) : entre(9, 16)) * crescimento)
    for (let i = 0; i < base; i++) {
      const almoco = chance(0.55)
      const quando = emHoras(dia, almoco ? entre(11, 14) : entre(18, 21))
      if (quando > agora) continue
      const sorteio = rnd()
      const origem = sorteio < 0.4 ? "BALCAO" : sorteio < 0.72 ? "COMANDA" : sorteio < 0.87 ? "TELEFONE" : "ONLINE"
      const itens = sortearItens(origem === "COMANDA" ? 5 : 3)
      const clienteIdx = chance(0.55) ? entre(0, clientes.length - 1) : null
      // Pedido online pode ser recusado pela loja (a fila da demo termina vazia).
      const recusada = origem === "ONLINE" && chance(0.08)
      const cancelada = !recusada && chance(0.03)
      const servico = origem === "COMANDA" && chance(0.85)
      const descontoPct = chance(0.08) ? escolher([5, 10]) : 0
      const dividido = origem === "COMANDA" && chance(0.35)

      await criarVenda({
        origem,
        quando,
        status: recusada ? "RECUSADO" : cancelada ? "CANCELADO" : "CONCLUIDO",
        itens,
        mesa: origem === "COMANDA" ? escolher(MESAS) : null,
        clienteIdx,
        entrega: (origem === "TELEFONE" || origem === "ONLINE") && chance(0.6),
        servico,
        descontoPct,
        pagamento: recusada || cancelada ? "nenhum" : dividido ? "dividido" : "conta",
        motivo: recusada
          ? escolher(["Fora da área de entrega", "Item esgotado", "Cozinha fechando"])
          : cancelada
            ? escolher(["Cliente desistiu", "Lançada em duplicidade", "Erro no pedido"])
            : undefined,
      })
    }
  }

  const horaAgora = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", hour12: false }).format(agora))

  await prisma.pedidoConfig.update({ where: { comercioId: comercio.id }, data: { proximoNumero: numero } })

  // ---- visitas no guia (analytics e conversão dos relatórios)
  const eventos: Prisma.AnalyticsEventCreateManyInput[] = []
  // Visitas crescendo ao longo dos dois meses (0,6× → 1,4×), com pouca variação
  // diária: a semana atual fica acima da anterior no Início ("+x% na semana").
  // Fim de semana tem mais movimento, como nas vendas.
  for (let d = DIAS; d >= 0; d--) {
    const dia = diaBase(d)
    const diaSemana = new Date(dia.getTime() + 3 * 3600000).getUTCDay()
    const tendencia = 0.6 + 0.8 * (1 - d / DIAS)
    const fimDeSemana = diaSemana === 0 || diaSemana === 6 ? 1.3 : 1
    const visitasDoDia = Math.round(38 * tendencia * fimDeSemana * (0.9 + 0.2 * rnd()))
    for (let i = 0; i < visitasDoDia; i++) {
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
  // Garantia da demo: nada em aberto (comanda, fila, produção).
  const emAberto = await prisma.pedido.count({
    where: { comercioId: comercio.id, status: { notIn: ["CONCLUIDO", "CANCELADO", "RECUSADO"] } },
  })
  if (emAberto > 0) throw new Error(`${emAberto} venda(s) ficaram em aberto — a demo deve terminar sem nenhuma.`)
  const [hoje] = await prisma.$queryRaw<{ n: number; total: string }[]>`
    SELECT COUNT(*)::int AS n, COALESCE(SUM(total), 0)::text AS total
    FROM pedidos WHERE "comercioId" = ${comercio.id} AND status = 'CONCLUIDO' AND "fechadaEm" >= ${diaBase(0)}`
  const recusadas = await prisma.pedido.count({ where: { comercioId: comercio.id, status: "RECUSADO" } })
  const canceladas = await prisma.pedido.count({ where: { comercioId: comercio.id, status: "CANCELADO" } })

  console.log(`\n✅ Loja de demonstração criada: ${NOME_LOJA} (fictícia)`)
  console.log(`   ${vendas.n} vendas concluídas · R$ ${Number(vendas.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${DIAS} dias`)
  console.log(`   hoje até ${horaAgora}h: ${hoje.n} vendas · R$ ${Number(hoje.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  console.log(`   ${canceladas} cancelada(s) · ${recusadas} recusada(s) · nenhuma em aberto · ${eventos.length} visitas no guia`)
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
