/**
 * Migração: cria o vínculo DONO de cada comércio existente
 *
 * A partir da Fase 1 do módulo de gestão, o acesso ao painel é decidido por
 * ComercioMembro (não mais por Comercio.ownerId). Comércios criados antes disso
 * só têm o ownerId — este script cria o ComercioMembro { papel: DONO } do titular.
 *
 * Idempotente: pode rodar várias vezes (skipDuplicates no @@unique [comercioId, userId]).
 * Rodar DEPOIS do `npm run db:push` e ANTES de publicar o código novo — sem o
 * vínculo, o comerciante vê "Nenhum comércio vinculado".
 *
 * Rodar: npx tsx prisma/migrate-membros-dono.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const comercios = await prisma.comercio.findMany({
    select: { id: true, ownerId: true, nome: true },
  })
  console.log(`🔍 ${comercios.length} comércio(s) encontrados`)

  const { count } = await prisma.comercioMembro.createMany({
    data: comercios.map((c) => ({ comercioId: c.id, userId: c.ownerId, papel: "DONO" as const })),
    skipDuplicates: true,
  })
  console.log(`✅ ${count} vínculo(s) DONO criado(s) (${comercios.length - count} já existiam)`)

  // Conferência: todo comércio precisa de ao menos um DONO ativo.
  const semDono = await prisma.comercio.findMany({
    where: { membros: { none: { papel: "DONO", ativo: true } } },
    select: { id: true, nome: true },
  })
  if (semDono.length > 0) {
    console.error("⚠️  Comércios sem DONO ativo:", semDono)
    process.exitCode = 1
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
