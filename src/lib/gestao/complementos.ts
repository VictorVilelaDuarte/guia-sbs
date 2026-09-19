import { prisma } from "@/lib/prisma"
import type { ComercioCtx } from "@/lib/comercio-ctx"
import { centavosDe } from "@/lib/pedidos"
import { ErroVenda } from "@/lib/gestao/vendas"

// Complementos do cardápio (docs/gestao-ideias.md 2.1): "Borda recheada +R$ 8",
// "adicional de bacon", "ponto da carne", "sem cebola". O grupo é da loja e é
// reaproveitado por vários produtos.
//
// Preço: o complemento entra no PREÇO UNITÁRIO do item da venda (o snapshot em
// PedidoItemComplemento guarda o detalhe). Assim subtotal, desconto, serviço,
// divisão da conta e relatórios continuam com uma conta só.

export const MAX_OPCOES = 40
export const MAX_GRUPOS_POR_PRODUTO = 10

export interface EscolhaComplemento {
  opcaoId: string
  quantidade?: number
}

export interface SnapshotComplemento {
  grupoNome: string
  nome: string
  precoC: number
  quantidade: number
}

type GrupoComOpcoes = {
  nome: string
  minimo: number
  maximo: number
  opcoes: { id: string; nome: string; preco: number; quantidadeMax: number; disponivel: boolean }[]
}

// Valida as escolhas contra as regras dos grupos do produto e devolve o
// snapshot + quanto somar no preço unitário. Roda no servidor em todos os
// canais (PDV, comanda, cardápio online e QR da mesa).
export function resolverComplementos(
  titulo: string,
  grupos: GrupoComOpcoes[],
  escolhas: EscolhaComplemento[] | null | undefined,
): { snapshots: SnapshotComplemento[]; extraC: number } {
  const lista = escolhas ?? []
  if (grupos.length === 0) {
    if (lista.length > 0) throw new ErroVenda(`"${titulo}" não tem complementos.`)
    return { snapshots: [], extraC: 0 }
  }

  const porOpcao = new Map(grupos.flatMap((g) => g.opcoes.map((o) => [o.id, { grupo: g, opcao: o }])))
  const snapshots: SnapshotComplemento[] = []
  const somaPorGrupo = new Map<string, number>()
  const vistas = new Set<string>()

  for (const escolha of lista) {
    const achado = porOpcao.get(escolha.opcaoId)
    if (!achado) throw new ErroVenda(`Opção indisponível em "${titulo}".`)
    if (vistas.has(escolha.opcaoId)) throw new ErroVenda(`Opção repetida em "${titulo}" — use a quantidade.`)
    vistas.add(escolha.opcaoId)
    const { grupo, opcao } = achado
    if (!opcao.disponivel) throw new ErroVenda(`"${opcao.nome}" está indisponível.`)
    const quantidade = escolha.quantidade ?? 1
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > opcao.quantidadeMax) {
      throw new ErroVenda(`Quantidade inválida em "${opcao.nome}" (máximo ${opcao.quantidadeMax}).`)
    }
    somaPorGrupo.set(grupo.nome, (somaPorGrupo.get(grupo.nome) ?? 0) + quantidade)
    snapshots.push({ grupoNome: grupo.nome, nome: opcao.nome, precoC: centavosDe(opcao.preco), quantidade })
  }

  for (const g of grupos) {
    const escolhido = somaPorGrupo.get(g.nome) ?? 0
    if (escolhido < g.minimo) {
      throw new ErroVenda(g.minimo === 1 ? `Escolha uma opção em "${g.nome}" (${titulo}).` : `Escolha ${g.minimo} opções em "${g.nome}" (${titulo}).`)
    }
    if (escolhido > g.maximo) throw new ErroVenda(`"${g.nome}" aceita no máximo ${g.maximo} opção(ões).`)
  }

  return { snapshots, extraC: snapshots.reduce((a, s) => a + s.precoC * s.quantidade, 0) }
}

// Grupos ativos de cada produto, prontos para a tela e para a validação.
export const grupoSelect = {
  nome: true,
  minimo: true,
  maximo: true,
  opcoes: { where: { disponivel: true }, orderBy: { ordem: "asc" as const }, select: { id: true, nome: true, preco: true, quantidadeMax: true, disponivel: true } },
}

export async function gruposDosProdutos(comercioId: string, produtoIds: string[]) {
  if (produtoIds.length === 0) return new Map<string, GrupoComOpcoes[]>()
  const vinculos = await prisma.produtoComplemento.findMany({
    where: { produtoId: { in: produtoIds }, grupo: { comercioId, ativo: true } },
    orderBy: { ordem: "asc" },
    select: { produtoId: true, grupo: { select: grupoSelect } },
  })
  const mapa = new Map<string, GrupoComOpcoes[]>()
  for (const v of vinculos) {
    const atual = mapa.get(v.produtoId) ?? []
    atual.push(v.grupo)
    mapa.set(v.produtoId, atual)
  }
  return mapa
}

// ---- cadastro (painel) ----------------------------------------------------------------

export async function listarGrupos(comercioId: string) {
  const grupos = await prisma.grupoComplemento.findMany({
    where: { comercioId },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: {
      id: true, nome: true, minimo: true, maximo: true, ativo: true, ordem: true,
      opcoes: { orderBy: { ordem: "asc" }, select: { id: true, nome: true, preco: true, quantidadeMax: true, disponivel: true, ordem: true } },
      _count: { select: { produtos: true } },
    },
  })
  return grupos.map((g) => ({ ...g, produtos: g._count.produtos, _count: undefined }))
}

export type GrupoPainel = Awaited<ReturnType<typeof listarGrupos>>[number]

export interface GrupoInput {
  nome: string
  minimo: number
  maximo: number
  ativo?: boolean
  opcoes: { nome: string; preco: number; quantidadeMax?: number; disponivel?: boolean }[]
}

function validarGrupo(input: GrupoInput) {
  const nome = input.nome?.trim().slice(0, 60)
  if (!nome) throw new ErroVenda("Informe o nome do grupo.")
  const opcoes = input.opcoes
    .map((o) => ({
      nome: o.nome?.trim().slice(0, 60) ?? "",
      preco: Math.max(0, Math.round((o.preco ?? 0) * 100) / 100),
      quantidadeMax: Math.min(Math.max(o.quantidadeMax ?? 1, 1), 20),
      disponivel: o.disponivel !== false,
    }))
    .filter((o) => o.nome)
  if (opcoes.length === 0) throw new ErroVenda("Adicione ao menos uma opção.")
  if (opcoes.length > MAX_OPCOES) throw new ErroVenda(`No máximo ${MAX_OPCOES} opções por grupo.`)
  const minimo = Math.max(0, Math.min(input.minimo ?? 0, 20))
  const maximo = Math.max(1, Math.min(input.maximo ?? 1, 20))
  if (minimo > maximo) throw new ErroVenda("O mínimo não pode ser maior que o máximo.")
  return { nome, minimo, maximo, opcoes }
}

export async function criarGrupo(ctx: ComercioCtx, input: GrupoInput) {
  const { nome, minimo, maximo, opcoes } = validarGrupo(input)
  const existe = await prisma.grupoComplemento.findFirst({ where: { comercioId: ctx.comercioId, nome: { equals: nome, mode: "insensitive" } } })
  if (existe) throw new ErroVenda(`Já existe o grupo "${nome}".`, 409)
  const ultimo = await prisma.grupoComplemento.aggregate({ where: { comercioId: ctx.comercioId }, _max: { ordem: true } })
  await prisma.grupoComplemento.create({
    data: {
      comercioId: ctx.comercioId,
      nome,
      minimo,
      maximo,
      ordem: (ultimo._max.ordem ?? -1) + 1,
      opcoes: { create: opcoes.map((o, i) => ({ ...o, ordem: i })) },
    },
  })
  return listarGrupos(ctx.comercioId)
}

// As opções são substituídas em bloco (mesmo padrão das variações do cardápio):
// o snapshot da venda não muda, então editar preço não mexe em conta antiga.
export async function atualizarGrupo(ctx: ComercioCtx, id: string, input: GrupoInput & { ativo?: boolean }) {
  const grupo = await prisma.grupoComplemento.findFirst({ where: { id, comercioId: ctx.comercioId }, select: { id: true } })
  if (!grupo) throw new ErroVenda("Grupo não encontrado.", 404)
  const { nome, minimo, maximo, opcoes } = validarGrupo(input)
  const outro = await prisma.grupoComplemento.findFirst({
    where: { comercioId: ctx.comercioId, nome: { equals: nome, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  })
  if (outro) throw new ErroVenda(`Já existe o grupo "${nome}".`, 409)
  await prisma.$transaction([
    prisma.opcaoComplemento.deleteMany({ where: { grupoId: id } }),
    prisma.grupoComplemento.update({
      where: { id },
      data: { nome, minimo, maximo, ...(input.ativo !== undefined ? { ativo: input.ativo } : {}), opcoes: { create: opcoes.map((o, i) => ({ ...o, ordem: i })) } },
    }),
  ])
  return listarGrupos(ctx.comercioId)
}

export async function excluirGrupo(ctx: ComercioCtx, id: string) {
  const grupo = await prisma.grupoComplemento.findFirst({ where: { id, comercioId: ctx.comercioId }, select: { id: true } })
  if (!grupo) throw new ErroVenda("Grupo não encontrado.", 404)
  await prisma.grupoComplemento.delete({ where: { id } }) // vínculos caem junto; vendas antigas mantêm o snapshot
  return listarGrupos(ctx.comercioId)
}

// Vincula os grupos a um produto (usado pelo formulário de produto).
export async function vincularGrupos(comercioId: string, produtoId: string, grupoIds: string[]) {
  const ids = [...new Set(grupoIds)].slice(0, MAX_GRUPOS_POR_PRODUTO)
  const validos = ids.length
    ? (await prisma.grupoComplemento.findMany({ where: { id: { in: ids }, comercioId }, select: { id: true } })).map((g) => g.id)
    : []
  await prisma.$transaction([
    prisma.produtoComplemento.deleteMany({ where: { produtoId, grupoId: { notIn: validos.length ? validos : ["-"] } } }),
    ...validos.map((grupoId, ordem) =>
      prisma.produtoComplemento.upsert({
        where: { produtoId_grupoId: { produtoId, grupoId } },
        create: { produtoId, grupoId, ordem },
        update: { ordem },
      }),
    ),
  ])
}
