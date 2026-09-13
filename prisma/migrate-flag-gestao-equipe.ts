/**
 * Migração: liga a feature `gestao_equipe` no plano premium
 *
 * A tela de equipe (Fase 1 / PR 3 do docs/modulo-gestao.md) é liberada pela flag
 * `gestao_equipe` do plano. Planos criados antes dela não têm a chave — este
 * script liga no `premium` (decisão de 2026-09-12). Outros planos seguem pela
 * tela de Planos do admin.
 *
 * Idempotente: só grava se a flag ainda não estiver true.
 *
 * Rodar: npx tsx prisma/migrate-flag-gestao-equipe.ts
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
  if (features.gestao_equipe === true) {
    console.log("✅ 'gestao_equipe' já estava ligada no premium")
    return
  }

  await prisma.plan.update({
    where: { id: plano.id },
    data: { features: { ...features, gestao_equipe: true } },
  })
  console.log("✅ 'gestao_equipe' ligada no plano premium")
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
