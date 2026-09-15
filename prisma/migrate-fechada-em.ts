/**
 * Migração: preenche `Pedido.fechadaEm` dos pedidos já encerrados
 *
 * Os relatórios (Fase 3 / PR 3 do docs/modulo-gestao.md) contam a venda na data
 * em que foi encerrada — concluída, ou recusada/cancelada sem ter sido concluída.
 * Até aqui só o PDV gravava essa data. Para os pedidos antigos, usa o histórico:
 * a primeira conclusão; senão, a entrada no status atual; senão, updatedAt.
 * Venda concluída e depois cancelada fica com a data da conclusão.
 *
 * Idempotente: só toca pedidos encerrados com fechadaEm vazio.
 *
 * Rodar: npx tsx prisma/migrate-fechada-em.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const n = await prisma.$executeRaw`
    UPDATE pedidos p SET "fechadaEm" = COALESCE(
      (SELECT MIN(h."createdAt") FROM pedido_historicos h WHERE h."pedidoId" = p.id AND h.status = 'CONCLUIDO'),
      (SELECT MIN(h."createdAt") FROM pedido_historicos h WHERE h."pedidoId" = p.id AND h.status = p.status),
      p."updatedAt"
    )
    WHERE p."fechadaEm" IS NULL AND p.status IN ('CONCLUIDO', 'CANCELADO', 'RECUSADO')`
  const semData = await prisma.pedido.count({ where: { fechadaEm: null, status: { in: ["CONCLUIDO", "CANCELADO", "RECUSADO"] } } })
  console.log(`✅ ${n} pedido(s) com data de encerramento preenchida · ${semData} encerrado(s) ainda sem data`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
