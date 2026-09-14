import type { Prisma } from "@prisma/client"

// Clientes da loja (docs/modulo-gestao.md, Fase 2). Cliente é sempre de UM
// comércio — nenhuma função aqui cruza lojas.

// WhatsApp como chave do cliente: só dígitos, com DDD, sem o código do país.
// "+55 (12) 99999-0000", "12 99999-0000" e "5512999990000" viram "12999990000".
// Só remove o 55 quando sobra um número nacional (10 ou 11 dígitos) — DDD 55 (RS)
// com 11 dígitos continua intacto. Formato inesperado é mantido (só dígitos) em
// vez de descartado.
export function normalizarWhatsapp(bruto: string | null | undefined): string | null {
  if (!bruto) return null
  let d = bruto.replace(/\D/g, "")
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2)
  return d.length > 0 ? d : null
}

// Garante o Cliente da loja para um WhatsApp e devolve o id (null sem WhatsApp).
// Roda DENTRO da transação do checkout. Usa INSERT ... ON CONFLICT DO NOTHING
// (createMany + skipDuplicates) em vez de upsert: dois pedidos simultâneos do mesmo
// número novo fariam um dos upserts falhar por unicidade — e, no Postgres, um erro
// aborta a transação inteira, derrubando o pedido. Com ON CONFLICT, a segunda
// transação espera a primeira, não insere nada e lê o registro já gravado.
// O nome só é usado na criação: pedidos seguintes não sobrescrevem o nome que a
// loja pode ter corrigido no cadastro.
export async function vincularCliente(
  tx: Prisma.TransactionClient,
  args: { comercioId: string; nome: string; whatsapp: string | null | undefined },
): Promise<string | null> {
  const whatsapp = normalizarWhatsapp(args.whatsapp)
  if (!whatsapp) return null
  await tx.cliente.createMany({
    data: [{ comercioId: args.comercioId, nome: args.nome.trim(), whatsapp }],
    skipDuplicates: true,
  })
  const cliente = await tx.cliente.findUnique({
    where: { comercioId_whatsapp: { comercioId: args.comercioId, whatsapp } },
    select: { id: true },
  })
  return cliente?.id ?? null
}
