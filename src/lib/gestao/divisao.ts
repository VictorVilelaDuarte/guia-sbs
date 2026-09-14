// Divisão da conta entre pessoas (PDV) — igual, por itens ou por valor.
// Módulo sem runtime: a tela calcula quanto cabe a cada pessoa e registra os
// pagamentos com o nome dela (`PedidoPagamento.pagante`). O servidor não precisa
// conhecer a divisão — só confere que os pagamentos fecham o total. Na comanda,
// o plano fica salvo em `Pedido.divisao` para sobreviver a recarga e a outro aparelho.
//
// Tudo em centavos inteiros e com soma exata: nenhum centavo some ou sobra.

export type ModoDivisao = "igual" | "itens" | "valor"

export interface PessoaDivisao {
  id: string
  nome: string
}

export interface PlanoDivisao {
  modo: ModoDivisao
  pessoas: PessoaDivisao[]
  // Por linha (chave do item): lista de partes, cada parte com as pessoas que a
  // dividem. Uma parte = a linha inteira; `quantidade` partes = por unidade.
  itens: Record<string, string[][]>
  // Modo valor: centavos combinados por pessoa.
  valores: Record<string, number>
}

export interface LinhaDivisao {
  chave: string
  valorC: number // valor da linha já com o desconto dela
  quantidade: number
}

export interface ResultadoDivisao {
  porPessoa: Record<string, number>
  // Itens sem ninguém (modo itens) ou diferença para o total (modo valor; negativo = passou).
  naoAtribuidoC: number
}

export const MAX_PESSOAS = 30

export function planoPadrao(n = 2): PlanoDivisao {
  return {
    modo: "igual",
    pessoas: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, nome: `Pessoa ${i + 1}` })),
    itens: {},
    valores: {},
  }
}

// Divide em partes iguais; os centavos que sobram vão para a primeira pessoa.
export function dividirIgual(totalC: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(totalC / n)
  return Array.from({ length: n }, (_, i) => (i === 0 ? totalC - base * (n - 1) : base))
}

// Rateio proporcional com soma exata (maiores restos). Pesos todos zero ⇒ igual.
export function ratear(totalC: number, pesos: number[]): number[] {
  const soma = pesos.reduce((a, p) => a + p, 0)
  if (pesos.length === 0) return []
  if (soma <= 0) return dividirIgual(totalC, pesos.length)
  const cotas = pesos.map((p) => (totalC * p) / soma)
  const base = cotas.map(Math.floor)
  let resto = totalC - base.reduce((a, b) => a + b, 0)
  const ordem = cotas
    .map((c, i) => ({ i, frac: c - Math.floor(c) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; resto > 0 && ordem.length > 0; k = (k + 1) % ordem.length, resto--) base[ordem[k].i]++
  return base
}

export function calcularDivisao(plano: PlanoDivisao, conta: { totalC: number; linhas: LinhaDivisao[] }): ResultadoDivisao {
  const ids = plano.pessoas.map((p) => p.id)
  const porPessoa: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]))
  if (ids.length === 0) return { porPessoa, naoAtribuidoC: conta.totalC }

  if (plano.modo === "igual") {
    dividirIgual(conta.totalC, ids.length).forEach((v, i) => (porPessoa[ids[i]] = v))
    return { porPessoa, naoAtribuidoC: 0 }
  }

  if (plano.modo === "valor") {
    let soma = 0
    for (const id of ids) {
      const v = Math.max(0, Math.round(plano.valores[id] ?? 0))
      porPessoa[id] = v
      soma += v
    }
    return { porPessoa, naoAtribuidoC: conta.totalC - soma }
  }

  // Por itens: cada pessoa acumula o valor dos itens dela (parte compartilhada é
  // dividida igualmente). Desconto da conta, serviço e entrega entram na
  // proporção do consumo — o rateio final é sobre o TOTAL, então fecha exato.
  const consumo: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]))
  let semDono = 0
  for (const linha of conta.linhas) {
    const partes = plano.itens[linha.chave]?.length ? plano.itens[linha.chave] : [[]]
    const valores = ratear(linha.valorC, partes.map(() => 1))
    partes.forEach((parte, i) => {
      const donos = parte.filter((id) => id in consumo)
      if (donos.length === 0) {
        semDono += valores[i]
        return
      }
      dividirIgual(valores[i], donos.length).forEach((v, j) => (consumo[donos[j]] += v))
    })
  }
  const pesos = [...ids.map((id) => consumo[id]), semDono]
  const final = ratear(conta.totalC, pesos)
  ids.forEach((id, i) => (porPessoa[id] = final[i]))
  return { porPessoa, naoAtribuidoC: final[ids.length] }
}

// Remove do plano o que não existe mais (pessoa excluída, item removido da conta).
export function limparPlano(plano: PlanoDivisao, chaves: string[]): PlanoDivisao {
  const ids = new Set(plano.pessoas.map((p) => p.id))
  const validas = new Set(chaves)
  const itens: PlanoDivisao["itens"] = {}
  for (const [chave, partes] of Object.entries(plano.itens)) {
    if (validas.has(chave)) itens[chave] = partes.map((parte) => parte.filter((id) => ids.has(id)))
  }
  const valores = Object.fromEntries(Object.entries(plano.valores).filter(([id]) => ids.has(id)))
  return { ...plano, itens, valores }
}
