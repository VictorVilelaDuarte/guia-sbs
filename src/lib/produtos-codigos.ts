import type { Prisma, PrismaClient } from "@prisma/client"

// Códigos de produto (código de barras e código interno). Regras:
// - únicos por loja entre TODOS os campos de código — de produtos e de
//   variações. O PDV busca o código lido em qualquer um deles, então o mesmo
//   valor em dois lugares tornaria a leitura ambígua;
// - o banco garante só dentro de `produtos` (@@unique por campo); o cruzamento
//   com `cardapio_variacoes` e entre os dois campos é checado aqui.

type Db = PrismaClient | Prisma.TransactionClient

// Tira espaços (leitor e digitação às vezes colam um no fim) e padroniza
// maiúsculas (código interno "ab12" = "AB12"). Vazio vira null.
export function normalizarCodigo(v: string | null | undefined): string | null {
  const limpo = (v ?? "").replace(/\s+/g, "").toUpperCase()
  return limpo || null
}

interface CodigosDoProduto {
  codigoBarras?: string | null
  codigoInterno?: string | null
  variacoes?: { nome: string; codigoBarras?: string | null; codigoInterno?: string | null }[]
}

// Devolve a mensagem de erro, ou null se os códigos podem ser usados.
// `produtoId` = o próprio produto numa edição (seus códigos atuais não conflitam).
export async function conflitoDeCodigos(
  db: Db,
  comercioId: string,
  dados: CodigosDoProduto,
  produtoId?: string,
): Promise<string | null> {
  const usados: { codigo: string; onde: string }[] = []
  if (dados.codigoBarras) usados.push({ codigo: dados.codigoBarras, onde: "código de barras" })
  if (dados.codigoInterno) usados.push({ codigo: dados.codigoInterno, onde: "código interno" })
  for (const v of dados.variacoes ?? []) {
    if (v.codigoBarras) usados.push({ codigo: v.codigoBarras, onde: `código de barras de "${v.nome}"` })
    if (v.codigoInterno) usados.push({ codigo: v.codigoInterno, onde: `código interno de "${v.nome}"` })
  }
  if (usados.length === 0) return null

  // Repetido dentro do próprio cadastro (ex.: produto e variação com o mesmo código).
  const vistos = new Set<string>()
  for (const u of usados) {
    if (vistos.has(u.codigo)) return `O código ${u.codigo} foi usado duas vezes neste produto.`
    vistos.add(u.codigo)
  }

  const codigos = [...vistos]
  const outroProduto = produtoId ? { id: { not: produtoId } } : {}
  const [produto, variacao] = await Promise.all([
    db.produto.findFirst({
      where: {
        comercioId,
        ...outroProduto,
        OR: [{ codigoBarras: { in: codigos } }, { codigoInterno: { in: codigos } }],
      },
      select: { titulo: true, codigoBarras: true, codigoInterno: true },
    }),
    db.cardapioVariacao.findFirst({
      where: {
        produto: { comercioId, ...outroProduto },
        OR: [{ codigoBarras: { in: codigos } }, { codigoInterno: { in: codigos } }],
      },
      select: { nome: true, codigoBarras: true, codigoInterno: true, produto: { select: { titulo: true } } },
    }),
  ])
  if (produto) {
    const codigo = codigos.find((c) => c === produto.codigoBarras || c === produto.codigoInterno)
    return `O código ${codigo} já está no produto "${produto.titulo}".`
  }
  if (variacao) {
    const codigo = codigos.find((c) => c === variacao.codigoBarras || c === variacao.codigoInterno)
    return `O código ${codigo} já está em "${variacao.produto.titulo} — ${variacao.nome}".`
  }
  return null
}

// Snapshot do cadastro no item vendido (PedidoItem.codigo / custoUnit): a
// variação escolhida manda, senão o produto. Custo em reais (Float) — quem
// grava converte para Decimal.
export function cadastroDoItem(
  p: { codigoBarras: string | null; codigoInterno: string | null; precoCusto: number | null },
  va?: { codigoBarras: string | null; codigoInterno: string | null; precoCusto: number | null } | null,
): { codigo: string | null; custo: number | null } {
  return {
    codigo: va?.codigoBarras ?? va?.codigoInterno ?? p.codigoBarras ?? p.codigoInterno ?? null,
    custo: va?.precoCusto ?? p.precoCusto ?? null,
  }
}
