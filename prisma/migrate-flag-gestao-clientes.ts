/**
 * Migração: liga a feature `gestao_clientes` no plano premium
 *
 * A tela de clientes (Fase 2 / PR 2 do docs/modulo-gestao.md) é liberada pela flag
 * `gestao_clientes` do plano. Planos criados antes dela não têm a chave — este
 * script liga no `premium` (decisão de 2026-09-13). Outros planos seguem pela
 * tela de Planos do admin.
 *
 * Idempotente: só grava se a flag ainda não estiver true.
 *
 * Rodar: npx tsx prisma/migrate-flag-gestao-clientes.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const plano = await prisma.plan.findUnique({
    where: { slug: "premium" },
    select: { id: true, features: true },
  })
  if (!plano) {
    console.error("⚠️  Plano 'premium' não encontrado — nada a fazer.")
    process.exitCode = 1
    return
  }

  const features = (plano.features ?? {}) as Record<string, unknown>
  if (features.gestao_clientes === true) {
    console.log("✅ 'gestao_clientes' já estava ligada no premium")
    return
  }

  await prisma.plan.update({
    where: { id: plano.id },
    data: { features: { ...features, gestao_clientes: true } },
  })
  console.log("✅ 'gestao_clientes' ligada no plano premium")
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
