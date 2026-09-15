/**
 * Migração: liga a feature `gestao_relatorios` no plano premium
 *
 * A venda manual e os relatórios (Fase 3 / PR 2 do docs/modulo-gestao.md) são liberados pela flag
 * `gestao_relatorios` do plano. Planos criados antes dela não têm a chave — este
 * script liga no `premium` (decisão de 2026-09-14). Outros planos seguem pela
 * tela de Planos do admin.
 *
 * Idempotente: só grava se a flag ainda não estiver true.
 *
 * Rodar: npx tsx prisma/migrate-flag-gestao-relatorios.ts
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
  if (features.gestao_relatorios === true) {
    console.log("✅ 'gestao_relatorios' já estava ligada no premium")
    return
  }

  await prisma.plan.update({
    where: { id: plano.id },
    data: { features: { ...features, gestao_relatorios: true } },
  })
  console.log("✅ 'gestao_relatorios' ligada no plano premium")
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
