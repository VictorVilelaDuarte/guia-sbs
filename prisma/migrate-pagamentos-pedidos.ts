/**
 * Migração: um PedidoPagamento para cada pedido que ainda não tem nenhum
 *
 * A partir do PDV (Fase 3 do docs/modulo-gestao.md), os relatórios por forma de
 * pagamento leem só de `pedido_pagamentos` — fonte única, que aceita várias
 * formas na mesma venda. Pedidos anteriores guardavam uma forma só em
 * `Pedido.formaPagamento`: este script cria o pagamento equivalente (forma,
 * total, troco como "recebido" e a data do pedido).
 *
 * Idempotente: só insere para pedidos sem nenhum pagamento. Rodar DEPOIS de
 * publicar o código novo (pega também os pedidos criados pelo código antigo
 * entre o db:push e a publicação).
 *
 * Rodar: npx tsx prisma/migrate-pagamentos-pedidos.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const antes = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM pedidos p
    WHERE NOT EXISTS (SELECT 1 FROM pedido_pagamentos pg WHERE pg."pedidoId" = p.id)`

  const inseridos = await prisma.$executeRaw`
    INSERT INTO pedido_pagamentos (id, "pedidoId", "comercioId", forma, valor, recebido, "createdAt")
    SELECT 'mig_' || p.id, p.id, p."comercioId", p."formaPagamento", p.total,
           CASE WHEN p."formaPagamento" = 'dinheiro' THEN p."trocoPara" END,
           p."createdAt"
    FROM pedidos p
    WHERE NOT EXISTS (SELECT 1 FROM pedido_pagamentos pg WHERE pg."pedidoId" = p.id)
    ON CONFLICT (id) DO NOTHING`

  const [conf] = await prisma.$queryRaw<{ pedidos: string; pagamentos: string }[]>`
    SELECT
      (SELECT COALESCE(SUM(total), 0) FROM pedidos)::text AS pedidos,
      (SELECT COALESCE(SUM(valor), 0) FROM pedido_pagamentos WHERE "estornadoEm" IS NULL)::text AS pagamentos`

  console.log(`✅ ${inseridos} pagamento(s) criado(s) (${antes[0]?.n ?? 0} pedido(s) sem pagamento)`)
  console.log(`   Soma dos pedidos: ${conf.pedidos} · soma dos pagamentos: ${conf.pagamentos}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
